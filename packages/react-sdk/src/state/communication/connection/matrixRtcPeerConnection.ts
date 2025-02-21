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

import { ConnectionState, Room } from 'livekit-client';
import { clone } from 'lodash';
import { getLogger } from 'loglevel';
import { concat, Observable, of, Subject } from 'rxjs';
import { Session } from '../discovery';
import { SFUConfig } from '../matrixRtcCommunicationChannel';
import { Message, PeerConnection, PeerConnectionStatistics } from './types';

// The label for a data channel is a version, that way we can detect if two
// WebRTC peers are using the same protocol.
const _DATA_CHANNEL_VERSION = '0';

export class MatrixRtcPeerConnection implements PeerConnection {
  private readonly logger = getLogger('PeerConnection');
  private readonly destroySubject = new Subject<void>();
  private readonly messageSubject = new Subject<Message>();
  private readonly statisticsSubject = new Subject<PeerConnectionStatistics>();
  private readonly statistics: PeerConnectionStatistics;
  private encoder: TextEncoder = new TextEncoder();
  private readonly connectionId: string;
  public readonly room = new Room();

  constructor(
    private readonly session: Session,
    private readonly sfuConfig: SFUConfig,
  ) {
    this.connectionId = this.session.sessionId;

    this.logger.log(
      `Creating connection ${this.connectionId} to ${session.sessionId} (${session.userId})`,
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
      connectionState: 'undefined',
      signalingState: 'undefined',
      iceConnectionState: 'undefined',
      iceGatheringState: 'undefined',
      dataChannelState: 'undefined',
    };

    this.initializeChannel(sfuConfig);
  }

  getRemoteSessionId(): string {
    return this.session.sessionId;
  }

  getConnectionId(): string {
    return this.connectionId;
  }

  close(): void {
    this.logger.log(
      `Closing connection ${this.connectionId} to ${this.session.sessionId} (${this.session.userId})`,
    );

    this.destroySubject.next();
    this.messageSubject.complete();
    this.statisticsSubject.complete();
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

  private updateStatistics(update: Partial<PeerConnectionStatistics>): void {
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
    /*
    fromEvent(this.channel, 'message', (e: MessageEvent) => e.data)
      .pipe(takeUntil(this.destroySubject))
      .subscribe((data) => {
        try {
          const message = JSON.parse(data);

          if (typeof message.type === 'string' && message.content) {
            this.messageSubject.next({
              senderSessionId: this.session.sessionId,
              senderUserId: this.session.userId,
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
            data,
          );
        }
      });

    for (const event of ['open', 'closing', 'close']) {
      fromEvent(this.channel, event)
        .pipe(takeUntil(this.destroySubject))
        .subscribe(() => {
          this.updateStatistics({ dataChannelState: this.channel?.readyState });
        });
    }
  }*/
  }
}
