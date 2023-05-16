/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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

import { TurnServer, WidgetApi } from '@matrix-widget-toolkit/api';
import { cloneDeep } from 'lodash';
import { getLogger } from 'loglevel';
import {
  BehaviorSubject,
  distinctUntilChanged,
  from,
  mergeMap,
  Observable,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import {
  Message,
  PeerConnection,
  PeerConnectionStatistics,
  WebRtcPeerConnection,
} from './connection';
import { SessionManager } from './discovery';
import { SignalingChannel } from './signaling';
import { CommunicationChannel, CommunicationChannelStatistics } from './types';
import { observeVisibilityState } from './visibilityState';

export class WebRtcCommunicationChannel implements CommunicationChannel {
  private readonly logger = getLogger('WebRtcCommunicationChannel');
  private readonly destroySubject = new Subject<void>();
  private readonly messagesSubject = new Subject<Message>();
  private readonly statisticsSubject =
    new Subject<CommunicationChannelStatistics>();
  private readonly statistics: CommunicationChannelStatistics = {
    peerConnections: {},
  };
  private readonly peerConnections: PeerConnection[] = [];
  private turnServers: TurnServer | undefined;

  constructor(
    private readonly widgetApiPromise: Promise<WidgetApi> | WidgetApi,
    private readonly sessionManager: SessionManager,
    private readonly signalingChannel: SignalingChannel,
    private readonly whiteboardId: string,
    onEnableObserveVisibilityState: Observable<boolean> = new BehaviorSubject(
      true
    ),
    visibilityTimeout = 30 * 1000
  ) {
    this.logger.log('Creating communication channel');

    from(Promise.resolve(this.widgetApiPromise))
      .pipe(
        switchMap((widgetApi) => widgetApi.observeTurnServers()),
        takeUntil(this.destroySubject)
      )
      .subscribe((turnServers) => {
        this.logger.log('Received new turn servers', turnServers);

        this.turnServers = turnServers;
      });

    this.sessionManager
      .observeSessionJoined()
      .pipe(takeUntil(this.destroySubject))
      .subscribe((session) => {
        const sessionId = this.sessionManager.getSessionId();

        this.logger.log('joined', session.sessionId, session.userId);

        if (!sessionId) {
          throw new Error('Unknown session id');
        }

        const peerConnection = new WebRtcPeerConnection(
          this.signalingChannel,
          session,
          sessionId,
          { turnServer: this.turnServers }
        );
        this.peerConnections.push(peerConnection);

        peerConnection
          .observeMessages()
          .subscribe((m) => this.messagesSubject.next(m));

        peerConnection.observeStatistics().subscribe({
          next: (peerConnectionStatistics) => {
            this.addPeerConnectionStatistics(
              peerConnection.getConnectionId(),
              peerConnectionStatistics
            );
          },
          complete: () => {
            this.addPeerConnectionStatistics(peerConnection.getConnectionId());
          },
        });
      });

    this.sessionManager
      .observeSessionLeft()
      .pipe(
        takeUntil(
          // Wait with unsubscribing the session left events till we processed
          // all of then, which is after completing the disconnect
          this.destroySubject.pipe(
            mergeMap(async () => {
              this.logger.log(
                'Communication channel destroyed, disconnecting…'
              );
              await this.disconnect();
            })
          )
        )
      )
      .subscribe((session) => {
        const index = this.peerConnections.findIndex(
          (c) => c.getRemoteSessionId() === session.sessionId
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
                    err
                  );
                }
              } else if (enableObserveVisibilityState) {
                try {
                  this.logger.log(
                    'Visibility changed to hidden, disconnecting…'
                  );
                  await this.disconnect();
                } catch (err) {
                  this.logger.error(
                    'Error while disconnecting from whiteboard',
                    err
                  );
                }
              }
            })
          )
        )
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

    this.statistics.localSessionId = sessionId;
    this.statisticsSubject.next(cloneDeep(this.statistics));
  }

  private async disconnect(): Promise<void> {
    this.logger.log('Disconnecting communication channel');

    await this.sessionManager.leave();

    this.statistics.localSessionId = undefined;
    this.statisticsSubject.next(cloneDeep(this.statistics));
  }

  private addPeerConnectionStatistics(
    connectionId: string,
    peerConnectionStatistics?: PeerConnectionStatistics
  ) {
    if (!peerConnectionStatistics) {
      delete this.statistics.peerConnections[connectionId];
    } else {
      this.statistics.peerConnections[connectionId] = peerConnectionStatistics;
    }

    this.statisticsSubject.next(cloneDeep(this.statistics));
  }
}
