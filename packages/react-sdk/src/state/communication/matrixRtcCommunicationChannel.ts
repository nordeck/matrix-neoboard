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
import cloneDeep from 'lodash/cloneDeep';
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
import { getServerNameFromUserId } from '../../lib';
import {
  MatrixRtcPeerConnection,
  Message,
  MessageOptions,
  PeerConnection,
  PeerConnectionStatistics,
} from './connection';
import { MatrixRtcSession, SessionManager } from './discovery';
import AutoDiscovery from './discovery/autodiscovery';
import { CommunicationChannel, CommunicationChannelStatistics } from './types';
import { observeVisibilityState } from './visibilityState';

type PeerConnectionWrapper = {
  connectionId: string;
  connection?: PeerConnection;
};

export class MatrixRtcCommunicationChannel implements CommunicationChannel {
  private readonly logger = getLogger('MatrixRtcCommunicationChannel');
  private readonly destroySubject = new Subject<void>();
  private readonly messagesSubject = new Subject<Message>();
  private readonly statisticsSubject =
    new Subject<CommunicationChannelStatistics>();

  private readonly peerConnections: Map<string, PeerConnectionWrapper> =
    new Map<string, PeerConnectionWrapper>();
  private readonly statistics: CommunicationChannelStatistics = {
    peerConnections: {},
    sessions: {},
  };

  constructor(
    private readonly widgetApiPromise: Promise<WidgetApi> | WidgetApi,
    private readonly sessionManager: SessionManager<MatrixRtcSession>,
    private readonly whiteboardId: string,
    onEnableObserveVisibilityState: Observable<boolean> = new BehaviorSubject(
      true,
    ),
    visibilityTimeout = 30 * 1000,
  ) {
    this.logger.log('Creating communication channel');

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
      .subscribe(this.handleSessionLeft.bind(this));

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
                if (this.statistics.localSession) {
                  // already connected
                  return;
                }

                try {
                  this.logger.log('Visibility changed to visible, connecting…');
                  await this.connect();
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

  broadcastMessage<T = unknown>(
    type: string,
    content: T,
    options?: MessageOptions,
  ): void {
    this.peerConnections.forEach(({ connectionId, connection }) => {
      if (
        connectionId === this.statistics.localSession?.livekitServiceUrl &&
        connection
      ) {
        connection.sendMessage(type, content, options);
      }
    });
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
    if (this.statistics.localSession) {
      this.logger.log('Communication channel is already open');
      return;
    }

    this.logger.log('Connecting communication channel');
    const {
      sessionId,
      memberId,
      livekitTransport: { livekitServiceUrl },
    } = await this.sessionManager.join(this.whiteboardId);

    this.statistics.localSession = {
      sessionId,
      memberId,
      livekitServiceUrl: livekitServiceUrl,
    };
    this.statisticsSubject.next(cloneDeep(this.statistics));

    await this.ensurePeerConnectionExists(livekitServiceUrl, memberId);
  }

  private async disconnect(): Promise<void> {
    this.logger.log('Disconnecting communication channel');

    // Reset all statistics first before leave to not reconnect
    // when session leave event is sent to channel from session manager
    this.statistics.localSession = undefined;
    this.statistics.sessions = {};
    this.statisticsSubject.next(cloneDeep(this.statistics));

    await this.sessionManager.leave();

    this.peerConnections.forEach((c) => {
      if (c.connection) {
        c.connection.close();
      }
    });
    this.peerConnections.clear();
  }

  private async handleSessionJoined(session: MatrixRtcSession): Promise<void> {
    this.logger.log('Joined', session.sessionId, session.userId);
    this.addSessionStatistics(session.sessionId, session);

    const widgetApi = await this.widgetApiPromise;
    const { userId } = widgetApi.widgetParameters;
    if (!userId) {
      throw new Error('User id not found in widget parameters');
    }

    if (
      getServerNameFromUserId(userId) ===
      getServerNameFromUserId(session.userId)
    ) {
      // Skip connection to local SFU, should be connected already
      return;
    }

    const localMemberId = this.statistics.localSession?.memberId;
    if (!localMemberId) {
      this.logger.warn(
        'Ignore incoming session, local session member id is undefined',
      );
      return;
    }

    // Establish connection to remote SFU if not connected already
    await this.ensurePeerConnectionExists(
      session.livekitTransport.livekitServiceUrl,
      localMemberId,
    );
  }

  private async handleSessionLeft(session: MatrixRtcSession): Promise<void> {
    this.logger.log('Left', session.sessionId, session.userId);
    this.addSessionStatistics(session.sessionId);

    if (this.statistics.localSession?.sessionId === session.sessionId) {
      this.logger.log('Observe own session left, rejoin peer connections');

      const {
        sessionId,
        memberId,
        livekitTransport: { livekitServiceUrl },
      } = await this.sessionManager.join(this.whiteboardId);

      this.statistics.localSession = {
        sessionId,
        memberId,
        livekitServiceUrl,
      };
      this.statisticsSubject.next(cloneDeep(this.statistics));

      for (const peerConnectionWrapper of this.peerConnections.values()) {
        if (peerConnectionWrapper.connection) {
          const existingPeerConnection = peerConnectionWrapper.connection;
          const connectionId = existingPeerConnection.getConnectionId();

          this.logger.log(
            `Close peer connection to ${connectionId} for session ${session.sessionId}`,
          );

          existingPeerConnection.close();

          try {
            peerConnectionWrapper.connection = await this.createPeerConnection(
              memberId,
              connectionId,
            );
          } catch (e) {
            this.logger.error(
              `Could not create a peer connection to ${livekitServiceUrl}`,
              e,
            );
            this.peerConnections.delete(livekitServiceUrl);
          }
        }
      }
    }
  }

  private async ensurePeerConnectionExists(
    livekitServiceUrl: string,
    memberId: string,
  ): Promise<void> {
    let peerConnectionWrapper: PeerConnectionWrapper | undefined =
      this.peerConnections.get(livekitServiceUrl);
    if (peerConnectionWrapper) {
      this.logger.log(`Use existing peer connection to ${livekitServiceUrl}`);
    } else {
      this.logger.log(`Create peer connection to ${livekitServiceUrl}`);
    }
    if (!peerConnectionWrapper) {
      peerConnectionWrapper = {
        connectionId: livekitServiceUrl,
      };
      this.peerConnections.set(livekitServiceUrl, peerConnectionWrapper);

      try {
        peerConnectionWrapper.connection = await this.createPeerConnection(
          memberId,
          livekitServiceUrl,
        );
      } catch (e) {
        this.logger.error(
          `Could not create a peer connection to ${livekitServiceUrl}`,
          e,
        );
        this.peerConnections.delete(livekitServiceUrl);
      }
    }
  }

  private async createPeerConnection(
    memberId: string,
    livekitServiceUrl: string,
  ): Promise<MatrixRtcPeerConnection> {
    const widgetApi = await this.widgetApiPromise;

    const { userId, roomId, deviceId } = widgetApi.widgetParameters;
    if (!userId || !roomId || !deviceId) {
      throw new Error('Unexpected widget parameters');
    }

    const openIdToken = await widgetApi.requestOpenIDConnectToken();

    const newOpenIdToken: IOpenIDCredentials = {
      access_token: openIdToken.access_token,
      expires_in: openIdToken.expires_in,
      matrix_server_name: openIdToken.matrix_server_name,
      token_type: openIdToken.token_type,
    };

    const sfuConfig = await AutoDiscovery.getSFUConfigWithOpenID(
      newOpenIdToken,
      livekitServiceUrl,
      roomId,
      `net.nordeck.whiteboard#${this.whiteboardId}`,
      userId,
      deviceId,
      memberId,
    );

    if (!sfuConfig) {
      throw new Error('Unable to retrieve LiveKit SFU configuration');
    }

    const peerConnection = new MatrixRtcPeerConnection(
      livekitServiceUrl,
      sfuConfig.url,
      sfuConfig.jwt,
      (sessionId) => {
        const session = this.statistics.sessions[sessionId];
        return session ? session.userId : undefined;
      },
    );

    this.initPeerConnectionStatistics(peerConnection);

    return peerConnection;
  }

  private initPeerConnectionStatistics(peerConnection: PeerConnection): void {
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

  private addSessionStatistics(sessionId: string, session?: MatrixRtcSession) {
    if (!session) {
      delete this.statistics.sessions[sessionId];
    } else {
      this.statistics.sessions[sessionId] = {
        userId: session.userId,
      };
    }

    this.statisticsSubject.next(cloneDeep(this.statistics));
  }
}
