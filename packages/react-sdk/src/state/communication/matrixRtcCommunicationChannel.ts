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
import {
  BehaviorSubject,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  interval,
  map,
  mergeMap,
  NEVER,
  Observable,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { raceWith, timeout } from 'rxjs/operators';
import { MatrixRtcPeerConnection, PeerConnection } from './connection';
import {
  areLiveKitFociEqual,
  LivekitFocus,
  MatrixRtcSessionManagerImpl,
  Session,
} from './discovery';
import AutoDiscovery from './discovery/autodiscovery';
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
  private activeFocus: LivekitFocus | undefined;
  private livekitFoci: LivekitFocus[] | undefined;

  constructor(
    private readonly widgetApiPromise: Promise<WidgetApi> | WidgetApi,
    private readonly sessionManager: MatrixRtcSessionManagerImpl,
    private readonly whiteboardId: string,
    onEnableObserveVisibilityState: Observable<boolean> = new BehaviorSubject(
      true,
    ),
    visibilityTimeout = 30 * 1000,
  ) {
    this.logger.log('Creating communication channel');

    this.sessionManager
      .observeFoci()
      .pipe(takeUntil(this.destroySubject))
      .subscribe((foci) => {
        this.livekitFoci = foci;
        this.logger.debug('LiveKit foci updated', foci[0]);
        // Check for focus change and restart backend
        if (
          this.activeFocus &&
          foci.length > 0 &&
          areLiveKitFociEqual(this.activeFocus, foci[0])
        ) {
          this.logger.debug('LiveKit focus changed, restarting backend');
          this.activeFocus = this.sfuConfig = undefined;
          this.initLiveKitBackend();
        }
      });

    this.sessionManager
      .observeSession()
      .pipe(takeUntil(this.destroySubject))
      .subscribe((session) => {
        this.logger.debug('Observing session', session);
        if (session.expiresTs !== undefined) {
          this.addSessionStatistics(session);
        } else {
          this.removeSessionStatistics(session);
        }
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

    this.peerConnections.forEach((c) => c.close());
  }

  /**
   * If there are already known LiveKit foci, this uses them.
   * Otherwise wait for LiveKit foci to be loaded until a timeout.
   */
  private async initLiveKitFoci(): Promise<void> {
    if (this.livekitFoci !== undefined && this.livekitFoci.length > 0) {
      this.logger.debug('LiveKit foci already known, skipping init');
      return;
    }

    this.logger.debug('Waiting for LiveKit foci...');
    const source = NEVER.pipe(timeout(2500)).pipe(
      raceWith(
        interval(250).pipe(
          map(() => {
            return this.livekitFoci;
          }),
          filter((foci) => foci !== undefined && foci.length > 0),
        ),
      ),
    );

    try {
      await firstValueFrom(source);
      this.logger.debug('LiveKit foci retrieved', this.livekitFoci);
    } catch (error) {
      this.logger.warn('Loading LiveKit foci timed out', error);
    }
  }

  private async initLiveKitBackend(): Promise<void> {
    if (this.sfuConfig !== undefined) {
      this.logger.debug('LiveKit config already set, skipping init');
      return;
    }

    // Initialize and wait for LiveKit foci first
    await this.initLiveKitFoci();

    if (!this.livekitFoci || this.livekitFoci.length === 0) {
      this.logger.error('No LiveKit foci available');
      throw new Error('No LiveKit foci available');
    }

    try {
      const widgetApi = await this.widgetApiPromise;

      if (!widgetApi.widgetParameters.roomId) {
        this.logger.error('Room ID not found in widget parameters');
        throw new Error('Room ID not found in widget parameters');
      }

      // Use the first focus from the list
      this.activeFocus = this.livekitFoci[0];
      this.sfuConfig = await AutoDiscovery.getSFUConfigWithOpenID(
        widgetApi,
        this.activeFocus,
      );

      this.logger.debug('Got SFU config', JSON.stringify(this.sfuConfig));

      if (!this.sfuConfig) {
        this.logger.warn('Failed to get LiveKit JWT');
        throw new Error('Failed to get LiveKit JWT');
      }
    } catch (error) {
      this.logger.error('Error getting the LiveKit SFU config', error);
      throw error;
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
    await this.initLiveKitBackend();

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
