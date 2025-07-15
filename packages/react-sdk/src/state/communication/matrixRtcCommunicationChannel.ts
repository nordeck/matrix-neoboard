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
import { ConnectionState } from 'livekit-client';
import { cloneDeep } from 'lodash';
import { getLogger } from 'loglevel';
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
import {
  isLivekitFocusConfig,
  LivekitFocus,
  RTCFocus,
  Session,
} from './discovery';
import AutoDiscovery from './discovery/autodiscovery';
import { SessionState } from './discovery/sessionManagerImpl';
import { MatrixRtcSessionManager } from './discovery/types';
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
    private readonly sessionManager: MatrixRtcSessionManager,
    private readonly whiteboardId: string,
    onEnableObserveVisibilityState: Observable<boolean> = new BehaviorSubject(
      true,
    ),
    visibilityTimeout = 30 * 1000,
  ) {
    this.logger.log('Creating communication channel');

    this.sessionManager
      .observeActiveFocus()
      .pipe(takeUntil(this.destroySubject))
      .subscribe({
        next: (focus) => {
          this.logger.debug('RTC Focus update received', focus);
          this.initFocusBackend(focus);
        },
        error: (error) => {
          this.logger.error('Error while updating focus', error);
        },
      });

    this.sessionManager
      .observeSession()
      .pipe(takeUntil(this.destroySubject))
      .subscribe((session) => {
        this.logger.debug('Got session changes for', session);
        if (session.expiresTs !== undefined) {
          this.addSessionStatistics(session);
        } else {
          this.removeSessionStatistics(session);
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
            takeUntil(this.destroySubject),
            mergeMap(async (v) => {
              if (v === 'visible') {
                try {
                  const activeFocus = this.sessionManager.getActiveFocus();
                  if (activeFocus) {
                    this.logger.log(
                      'Visibility changed to visible, connecting…',
                    );
                    await this.initFocusBackend(activeFocus);
                  } else {
                    this.logger.warn(
                      'Visibility changed to visible but no active focus found, not connecting',
                    );
                  }
                } catch (err) {
                  this.logger.error(
                    'Error while connecting to focus backend',
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

    this.disconnect().catch((err) => {
      this.logger.error('Error while disconnecting communication channel', err);
    });
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

    this.sfuConfig = undefined;
    await this.sessionManager.leave();

    this.statistics.localSessionId = undefined;
    this.statisticsSubject.next(cloneDeep(this.statistics));

    this.statistics.sessions = [];
    this.peerConnections.forEach((c) => c.close());
  }

  private async initFocusBackend(focus: RTCFocus): Promise<void> {
    this.logger.debug('Initializing focus backend with focus', focus);

    if (focus.type !== 'livekit') {
      this.logger.error(
        'Unable to init focus backend due to unsupported active focus type',
        focus.type,
      );
      throw new Error('Unsupported active focus type');
    }

    if (!isLivekitFocusConfig(focus)) {
      this.logger.error(
        'Unable to init focus backend due to unsupported LiveKit configuration',
        focus,
      );
      throw new Error('Unsupported active focus backend configuration');
    }

    const widgetApi = await this.widgetApiPromise;
    if (!widgetApi.widgetParameters.roomId) {
      this.logger.error('Room ID not found in widget parameters');
      throw new Error('Room ID not found in widget parameters');
    }

    // Disconnect before starting a new backend connection
    await this.disconnect();

    // The LiveKit alias is required to check for room membership when requesting the
    // OpenID token and place users in the same LiveKit data exchange room
    const activeFocus: LivekitFocus = {
      ...focus,
      livekit_alias: widgetApi.widgetParameters.roomId,
    };

    this.sfuConfig = await AutoDiscovery.getSFUConfigWithOpenID(
      widgetApi,
      activeFocus,
    );

    if (!this.sfuConfig) {
      this.logger.error('Unable to retrieve LiveKit SFU configuration');
      throw new Error('Unable to retrieve LiveKit SFU configuration');
    }

    const { userId, deviceId } = widgetApi.widgetParameters;
    if (!userId || !deviceId) {
      this.logger.error('User ID or device ID not found in widget parameters');
      throw new Error('User ID or device ID not found in widget parameters');
    }

    const sessionId = `_${userId}_${deviceId}`;
    const session: Session = { sessionId: sessionId, userId: userId };

    this.logger.debug(
      'Creating peer connection with focus config',
      JSON.stringify(this.sfuConfig),
      'for session',
      session.sessionId,
    );
    const peerConnection = new MatrixRtcPeerConnection(session, this.sfuConfig);
    this.peerConnections.push(peerConnection);

    peerConnection.observeConnectionState().subscribe(async (state) => {
      this.logger.debug('Peer connection state changed:', state);

      switch (state) {
        case ConnectionState.Connected:
          await this.connect();
          break;

        case ConnectionState.Disconnected:
          await this.disconnect();
          break;

        case ConnectionState.Connecting:
        case ConnectionState.Reconnecting:
        case ConnectionState.SignalReconnecting:
          break;

        default:
          break;
      }
    });

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
      (existingSession) => existingSession.sessionId === session.sessionId,
    );

    // If session exists, replace it with the new session
    if (existingSessionIndex !== -1) {
      this.statistics.sessions[existingSessionIndex] = session;
    } else {
      // If session does not exist, add it
      this.statistics.sessions.push(session);
    }
  }

  private removeSessionStatistics(session: SessionState) {
    if (!this.statistics.sessions) {
      return;
    }

    // Remove the session from the list
    this.statistics.sessions = this.statistics.sessions.filter(
      (s) => s.sessionId !== session.sessionId,
    );
  }
}
