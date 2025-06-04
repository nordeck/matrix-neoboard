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

import {
  ConnectionState,
  RemoteParticipant,
  Room,
  RoomEvent,
} from 'livekit-client';
import { clone } from 'lodash';
import { getLogger } from 'loglevel';
import {
  concat,
  interval,
  Observable,
  of,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { Session } from '../discovery';
import { SFUConfig } from '../matrixRtcCommunicationChannel';
import { Message, PeerConnection, PeerConnectionStatistics } from './types';
import { extractPeerConnectionStatistics } from './utils';

export class MatrixRtcPeerConnection implements PeerConnection {
  private readonly logger = getLogger('PeerConnection');
  private readonly destroySubject = new Subject<void>();
  private readonly messageSubject = new Subject<Message>();
  private readonly statisticsSubject = new Subject<PeerConnectionStatistics>();
  private readonly connectionStateSubject = new Subject<ConnectionState>();
  private readonly statistics: PeerConnectionStatistics;
  private encoder: TextEncoder = new TextEncoder();
  private decoder: TextDecoder = new TextDecoder();
  private readonly connectionId: string;
  public readonly room = new Room();

  constructor(
    private readonly session: Session,
    private readonly sfuConfig: SFUConfig,
  ) {
    this.connectionId = this.session.sessionId;

    this.logger.log(
      `Creating connection ${this.connectionId}`,
    );

    // Statistics gathering
    this.statistics = {
      remoteSessionId: session.sessionId,
      remoteUserId: session.userId,
      impolite: false,
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0,
      connectionState: ConnectionState.Disconnected,
      signalingState: 'undefined',
      iceConnectionState: 'undefined',
      iceGatheringState: 'undefined',
      dataChannelState: 'undefined',
    };

    // In LiveKit, we have two peer connections, one for publishing and one for subscribing.
    // We need to gather statistics for both.
    interval(1000)
      .pipe(
        takeUntil(this.destroySubject),
        switchMap(
          async () =>
            await this.room.localParticipant.engine?.pcManager?.publisher.getStats(),
        ),
      )
      .subscribe((report) => {
        if (report !== undefined) {
          this.updateStatistics(extractPeerConnectionStatistics(report));
        }
      });

    interval(1000)
      .pipe(
        takeUntil(this.destroySubject),
        switchMap(
          async () =>
            await this.room.localParticipant.engine?.pcManager?.subscriber.getStats(),
        ),
      )
      .subscribe((report) => {
        if (report !== undefined) {
          this.updateStatistics(extractPeerConnectionStatistics(report));
        }
      });

    this.initializeChannel(sfuConfig);
  }

  getRemoteSessionId(): string {
    return this.session.sessionId;
  }

  getConnectionId(): string {
    return this.connectionId;
  }

  destroy(): void {
    this.logger.log(
      `Destroying connection ${this.connectionId}`,
    );

    this.close();
  }

  close(): void {
    this.logger.log(
      `Closing connection ${this.connectionId}`,
    );

    this.room.disconnect();

    this.destroySubject.next();
    this.messageSubject.complete();
    this.statisticsSubject.complete();
    this.connectionStateSubject.complete();
  }

  sendMessage<T = unknown>(type: string, content: T): void {
    if (this.room.state === ConnectionState.Connected) {
      const message = { type, content };
      const data = this.encoder.encode(JSON.stringify(message));
      this.room.localParticipant.publishData(data);
    }
  }

  observeMessages(): Observable<Message> {
    return this.messageSubject;
  }

  observeStatistics(): Observable<PeerConnectionStatistics> {
    return concat(of(this.statistics), this.statisticsSubject);
  }

  observeConnectionState(): Observable<ConnectionState> {
    return this.connectionStateSubject;
  }

  updateStatistics(update: Partial<PeerConnectionStatistics>): void {
    if (Object.keys(update).length > 0) {
      Object.assign(this.statistics, update);

      this.statisticsSubject.next(clone(this.statistics));
    }
  }

  private async initializeChannel(sfuConfig: SFUConfig) {
    this.room
      .prepareConnection(sfuConfig.url, sfuConfig.jwt)
      .then(() => this.room.connect(sfuConfig.url, sfuConfig.jwt))
      .then(() => {
        if (!this.room) {
          throw new Error('Room not initialized');
        }
        return;
      })
      .catch((error) => {
        this.logger.error(`Failed to initialize connection: ${error.message}`);
      });

    this.room.on(RoomEvent.DataReceived, (payload, participant) => {
      this.handleDataReceived(payload, participant);
    });

    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      this.logger.log(
        `Connection state of connection ${this.connectionId} changed: ${state}`,
      );

      this.connectionStateSubject.next(state);

      this.updateStatistics({
        connectionState: state,
      });
    });
  }

  handleDataReceived(
    payload: Uint8Array,
    participant: RemoteParticipant | undefined,
  ): void {
    try {
      const message = JSON.parse(this.decoder.decode(payload));

      if (typeof message.type === 'string' && message.content && participant) {
        this.messageSubject.next({
          senderSessionId: this.session.sessionId,
          senderUserId: participant.identity,
          ...message,
        });
      } else {
        this.logger.warn(
          `Received invalid message for connection ${this.connectionId}`,
          message,
        );
      }
    } catch {
      this.logger.warn(
        `Received invalid message JSON for connection ${this.connectionId}`,
        payload,
      );
    }
  }
}
