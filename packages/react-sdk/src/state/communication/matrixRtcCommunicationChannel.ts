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
import { Room } from 'livekit-client';
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
import { LivekitFocus } from '../../model';
import { Session, SessionManager } from './discovery';
import { SessionState } from './discovery/matrixRtcSessionManagerImpl';
import {
  CommunicationChannel,
  CommunicationChannelStatistics,
  Message,
} from './types';
import { observeVisibilityState } from './visibilityState';

export interface SFUConfig {
  url: string;
  jwt: string;
}

export function sfuConfigEquals(a?: SFUConfig, b?: SFUConfig): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;

  return a.jwt === b.jwt && a.url === b.url;
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
  private encoder: TextEncoder = new TextEncoder();
  private decoder: TextDecoder = new TextDecoder();
  private sfuConfig: SFUConfig | undefined;
  private liveKitRoom: Room | undefined;

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
        this.addSessionStatistics(session);
      });

    this.sessionManager
      .observeSessionJoined()
      .pipe(takeUntil(this.destroySubject))
      .subscribe(this.handleSessionJoined.bind(this));

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
    if (this.liveKitRoom) {
      const message = { type, content };
      const data = JSON.stringify(message);
      this.liveKitRoom.localParticipant.publishData(this.encoder.encode(data));
    }
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
    if (this.sfuConfig !== undefined && this.liveKitRoom !== undefined) {
      // LiveKit servers already known
      return;
    }

    try {
      const widgetApi = await Promise.resolve(this.widgetApiPromise);

      const focus = (await makePreferredLivekitFoci(session))[0];
      this.sfuConfig = await getSFUConfigWithOpenID(widgetApi, focus);
      if (!this.sfuConfig) {
        this.liveKitRoom = new Room({});
        await this.liveKitRoom.connect(
          this.sfuConfig!.url,
          this.sfuConfig!.jwt,
        );
      } else {
        this.logger.warn('Failed to get LiveKit JWT');
        throw new Error('Failed to get LiveKit JWT');
      }
    } catch (error) {
      this.logger.warn('LiveKit setup timed out', error);
    }
  }

  private async handleSessionJoined(session: Session): Promise<void> {
    const sessionId = this.sessionManager.getSessionId();

    this.logger.log('joined', session.sessionId, session.userId);

    if (!sessionId) {
      throw new Error('Unknown session id');
    }

    // Wait for the Widget API and TURN servers to be ready
    await this.widgetApiPromise;
    await this.initLiveKitServer(session);

    /*
    const peerConnection = new WebRtcPeerConnection(
      this.signalingChannel,
      session,
      sessionId,
      { turnServer: this.turnServers },
    );
    this.peerConnections.push(peerConnection);

    peerConnection
      .observeMessages()
      .subscribe((m) => this.messagesSubject.next(m));

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
    */
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
 * @todo this is hardcoded, needs to load from well-known and user session
 */
async function makePreferredLivekitFoci(
  rtcSession: Session,
  livekitAlias: string = 'livekit',
): Promise<LivekitFocus[]> {
  console.log('Start building foci_preferred list: ', rtcSession.sessionId);

  const preferredFoci: LivekitFocus[] = [];

  const livekit_config: LivekitFocus = {
    type: 'livekit',
    livekit_service_url: 'https://livekit-jwt.matrix.internal',
    livekit_alias: livekitAlias,
  };

  preferredFoci.push(livekit_config);

  return preferredFoci;
}

async function getSFUConfigWithOpenID(
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
      throw new Error('SFU Config fetch failed with status code ' + res.status);
    }
    const sfuConfig = await res.json();
    console.log(
      'get SFU config: \nurl:',
      sfuConfig.url,
      '\njwt',
      sfuConfig.jwt,
    );
    return sfuConfig;
  } catch (e) {
    throw new Error('SFU Config fetch failed with exception ' + e);
  }
}
