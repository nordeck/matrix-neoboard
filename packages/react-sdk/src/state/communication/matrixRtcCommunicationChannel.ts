/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { WidgetApi } from '@matrix-widget-toolkit/api';
import { cloneDeep } from 'lodash';
import { getLogger } from 'loglevel';
import { IOpenIDCredentials } from 'matrix-widget-api';
import {
  BehaviorSubject,
  distinctUntilChanged,
  mergeMap,
  Observable,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { MatrixRtcPeerConnection, PeerConnection } from './connection';
import { LivekitFocus, Session, SessionManager } from './discovery';
import { SessionState } from './discovery/sessionManagerImpl';
import {
  CommunicationChannel,
  CommunicationChannelStatistics,
  Message,
  PeerConnectionStatistics,
} from './types';
import { observeVisibilityState } from './visibilityState';

export interface SFUConfig {
  url: string;
  jwt: string;
}

export class MatrixRtcCommunicationChannel implements CommunicationChannel {
  private readonly logger = getLogger('MatrixRtcCommunicationChannel');
  private readonly destroySubject = new Subject<void>();
  private readonly messagesSubject = new Subject<Message>();
  private readonly statisticsSubject =
    new Subject<CommunicationChannelStatistics>();
  private readonly statistics: CommunicationChannelStatistics = {
    peerConnections: {},
    sessions: [],
  };
  private readonly peerConnections: PeerConnection[] = [];
  private sfuConfig: SFUConfig | undefined;

  constructor(
    private readonly widgetApiPromise: Promise<WidgetApi> | WidgetApi,
    private readonly sessionManager: SessionManager,
    private readonly whiteboardId: string,
    onEnableObserveVisibilityState: Observable<boolean> = new BehaviorSubject(
      true,
    ),
    visibilityTimeout = 30 * 1000,
  ) {
    this.logger.log('Creating communication channel');

    this.sessionManager
      .observeSession()
      .pipe(takeUntil(this.destroySubject))
      .subscribe((session) => {
        this.logger.debug('Adding session statistics', session);
        this.addSessionStatistics(session);
      });

    this.sessionManager
      .observeSessionJoined()
      .pipe(takeUntil(this.destroySubject))
      .subscribe(this.handleSessionJoined.bind(this));

    this.sessionManager
      .observeSessionLeft()
      .pipe(
        takeUntil(
          // Wait with unsubscribing the session left events till we processed
          // all of then, which is after completing the disconnect
          this.destroySubject.pipe(
            mergeMap(async () => {
              this.logger.log(
                'Communication channel destroyed, disconnecting…',
              );
              await this.disconnect();
            }),
          ),
        ),
      )
      .subscribe((session) => {
        const index = this.peerConnections.findIndex(
          (c) => c.getRemoteSessionId() === session.sessionId,
        );

        if (index >= 0) {
          this.peerConnections[index].close();
          this.peerConnections.splice(index, 1);
        }
      });

    // If the tab is in the background, we want to disconnect from the room to
    // save resources. We reconnect once the tab is active again.
    onEnableObserveVisibilityState
      .pipe(
        takeUntil(this.destroySubject),
        distinctUntilChanged(),
        switchMap((enableObserveVisibilityState) =>
          observeVisibilityState(visibilityTimeout).pipe(
            mergeMap(async (v) => {
              if (v === 'visible') {
                try {
                  this.logger.log('Visibility changed to visible, connecting…');
                  await this.connect();
                } catch (err) {
                  this.logger.error(
                    'Error while connecting to whiteboard',
                    err,
                  );
                }
              } else if (enableObserveVisibilityState) {
                try {
                  this.logger.log(
                    'Visibility changed to hidden, disconnecting…',
                  );
                  await this.disconnect();
                } catch (err) {
                  this.logger.error(
                    'Error while disconnecting from whiteboard',
                    err,
                  );
                }
              }
            }),
          ),
        ),
      )
      .subscribe();
  }

  broadcastMessage<T = unknown>(type: string, content: T): void {
    this.peerConnections.forEach((c) => c.sendMessage(type, content));
  }

  observeMessages(): Observable<Message> {
    return this.messagesSubject;
  }

  destroy() {
    this.logger.log('Destroying communication channel');

    this.messagesSubject.complete();
    this.statisticsSubject.complete();
    this.destroySubject.next();
  }

  getStatistics(): CommunicationChannelStatistics {
    return this.statistics;
  }

  observeStatistics(): Observable<CommunicationChannelStatistics> {
    return this.statisticsSubject;
  }

  private async connect() {
    if (this.statistics.localSessionId) {
      this.logger.log('Communication channel is already open');
      return;
    }

    this.logger.log('Connecting communication channel');
    const { sessionId } = await this.sessionManager.join(this.whiteboardId);

    const widgetApi = await this.widgetApiPromise;

    if (!widgetApi.widgetParameters.userId) {
      this.logger.error('User ID not found in widget parameters');
      throw new Error('User ID not found in widget parameters');
    }

    await this.handleSessionJoined({
      sessionId,
      userId: widgetApi.widgetParameters.userId,
    });

    this.statistics.localSessionId = sessionId;
    this.statisticsSubject.next(cloneDeep(this.statistics));
  }

  private async disconnect(): Promise<void> {
    this.logger.log('Disconnecting communication channel');

    await this.sessionManager.leave();

    this.statistics.localSessionId = undefined;
    this.statisticsSubject.next(cloneDeep(this.statistics));
  }

  private async initLiveKitServer(session: Session): Promise<void> {
    if (this.sfuConfig !== undefined) {
      this.logger.debug('LiveKit config already set, skipping init');
      // LiveKit servers already known
      return;
    }

    try {
      const widgetApi = await this.widgetApiPromise;

      if (!widgetApi.widgetParameters.roomId) {
        this.logger.error('Room ID not found in widget parameters');
        throw new Error('Room ID not found in widget parameters');
      }

      const focus = (
        await makePreferredLivekitFoci(
          session,
          widgetApi.widgetParameters.roomId,
        )
      )[0];
      this.sfuConfig = await getSFUConfigWithOpenID(widgetApi, focus);

      this.logger.debug('Got SFU config', JSON.stringify(this.sfuConfig));

      if (!this.sfuConfig) {
        this.logger.warn('Failed to get LiveKit JWT');
        throw new Error('Failed to get LiveKit JWT');
      }
    } catch (error) {
      this.logger.error('Error getting the LiveKit SFU config', error);
    }
  }

  private async handleSessionJoined(session: Session): Promise<void> {
    const sessionId = this.sessionManager.getSessionId();

    this.logger.log('joined', session.sessionId, session.userId);

    if (!sessionId) {
      this.logger.error('Unknown session id on session join');
      throw new Error('Unknown session id on session join');
    }

    // Wait for the Widget API and LiveKit servers to be ready
    await this.widgetApiPromise;
    await this.initLiveKitServer(session);

    // only start peer connection for the current session
    // because matrix rtc is not peer to peer
    if (this.sfuConfig && session.sessionId === sessionId) {
      this.logger.debug(
        'Creating peer connection with SFU config',
        JSON.stringify(this.sfuConfig),
        'for session',
        session.sessionId,
      );
      const peerConnection = new MatrixRtcPeerConnection(
        session,
        this.sfuConfig,
      );
      this.peerConnections.push(peerConnection);

      peerConnection.observeMessages().subscribe((m) => {
        return this.messagesSubject.next(m);
      });

      peerConnection.observeStatistics().subscribe({
        next: (peerConnectionStatistics) => {
          this.addPeerConnectionStatistics(
            peerConnection.getConnectionId(),
            peerConnectionStatistics,
          );
        },
        complete: () => {
          this.addPeerConnectionStatistics(peerConnection.getConnectionId());
        },
      });
    } else {
      this.logger.warn(
        'No LiveKit SFU config or session id, unable to create peer connection',
      );
    }
  }

  private addPeerConnectionStatistics(
    connectionId: string,
    peerConnectionStatistics?: PeerConnectionStatistics,
  ) {
    if (!peerConnectionStatistics) {
      delete this.statistics.peerConnections[connectionId];
    } else {
      this.statistics.peerConnections[connectionId] = peerConnectionStatistics;
    }

    this.statisticsSubject.next(cloneDeep(this.statistics));
  }

  private addSessionStatistics(session: SessionState) {
    if (!this.statistics.sessions) {
      this.statistics.sessions = [];
    }

    // Find the index of the session if it already exists
    const existingSessionIndex = this.statistics.sessions.findIndex(
      (existingSession) =>
        existingSession.sessionId === session.sessionId &&
        existingSession.userId === session.userId &&
        existingSession.whiteboardId === session.whiteboardId,
    );

    // If session exists, replace it with the new session
    if (existingSessionIndex !== -1) {
      this.statistics.sessions[existingSessionIndex] = session;
    } else {
      // If session does not exist, add it
      this.statistics.sessions.push(session);
    }
  }
}

/*
 * @todo this is hardcoded, needs to be implemented
 */
async function makePreferredLivekitFoci(
  rtcSession: Session,
  livekitAlias: string,
): Promise<LivekitFocus[]> {
  const logger = getLogger('makePreferredLivekitFoci');
  logger.debug('Building preferred foci list for', rtcSession.sessionId);

  const preferredFoci: LivekitFocus[] = [];

  const livekit_config: LivekitFocus = {
    type: 'livekit',
    livekit_service_url: 'https://livekit-jwt.matrix.internal',
    livekit_alias: livekitAlias,
  };

  preferredFoci.push(livekit_config);

  return preferredFoci;
}

export async function getSFUConfigWithOpenID(
  widgetApi: WidgetApi,
  activeFocus: LivekitFocus,
): Promise<SFUConfig | undefined> {
  const logger = getLogger('getSFUConfigWithOpenID');
  const openIdToken = await widgetApi.requestOpenIDConnectToken();

  logger.debug('Got openID token', openIdToken);

  try {
    logger.info(
      `Trying to get JWT from call's active focus URL of ${activeFocus.livekit_service_url}...`,
    );
    const sfuConfig = await getLiveKitJWT(
      widgetApi,
      activeFocus.livekit_service_url,
      activeFocus.livekit_alias,
      openIdToken,
    );
    logger.info(`Got JWT from call's active focus URL.`);

    return sfuConfig;
  } catch (e) {
    logger.warn(
      `Failed to get JWT from RTC session's active focus URL of ${activeFocus.livekit_service_url}.`,
      e,
    );
    return undefined;
  }
}

async function getLiveKitJWT(
  widgetApi: WidgetApi,
  livekitServiceURL: string,
  roomName: string,
  openIDToken: IOpenIDCredentials,
): Promise<SFUConfig> {
  const logger = getLogger('getLiveKitJWT');

  try {
    const res = await fetch(livekitServiceURL + '/sfu/get', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        room: roomName,
        openid_token: openIDToken,
        device_id: widgetApi.widgetParameters.deviceId,
      }),
    });
    if (!res.ok) {
      logger.error('SFU Config fetch failed with status code', res.status);
      throw new Error('SFU Config fetch failed with status code ' + res.status);
    }
    const sfuConfig = await res.json();
    logger.debug(
      'Get SFU config: \nurl:',
      sfuConfig.url,
      '\njwt',
      sfuConfig.jwt,
    );
    return sfuConfig;
  } catch (e) {
    logger.error('SFU Config fetch failed with exception', e);
    throw new Error('SFU Config fetch failed with exception ' + e);
  }
}
