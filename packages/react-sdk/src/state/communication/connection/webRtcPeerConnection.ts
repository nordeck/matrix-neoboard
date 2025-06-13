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

import { TurnServer } from '@matrix-widget-toolkit/api';
import { clone } from 'lodash';
import { getLogger } from 'loglevel';
import {
  buffer,
  concat,
  filter,
  fromEvent,
  interval,
  Observable,
  of,
  race,
  Subject,
  switchMap,
  takeUntil,
} from 'rxjs';
import { Session } from '../discovery';
import { SignalingChannel } from '../signaling';
import { Message, PeerConnection, PeerConnectionStatistics } from './types';
import { extractPeerConnectionStatistics, isImpolite } from './utils';

// TODO: Falling back to a third-party server might be undesired due to privacy
// reasons.
const FALLBACK_ICE_SERVER = 'stun:turn.matrix.org';

// The label for a data channel is a version, that way we can detect if two
// WebRTC peers are using the same protocol.
const DATA_CHANNEL_VERSION = '0';

export class WebRtcPeerConnection implements PeerConnection {
  private readonly logger = getLogger('PeerConnection');
  private readonly destroySubject = new Subject<void>();
  private readonly messageSubject = new Subject<Message>();
  private readonly statisticsSubject = new Subject<PeerConnectionStatistics>();
  private readonly statistics: PeerConnectionStatistics;
  private readonly connection: RTCPeerConnection;
  private readonly connectionId: string;
  private channel?: RTCDataChannel;

  constructor(
    private readonly signalingChannel: SignalingChannel,
    private readonly session: Session,
    private readonly ownSessionId: string,
    {
      turnServer,
      statisticsInterval = 1000,
      relay = false,
    }: {
      turnServer?: TurnServer;
      statisticsInterval?: number;
      relay?: boolean;
    } = {},
  ) {
    const impolite = isImpolite(this.ownSessionId, this.session.sessionId);
    this.connectionId = impolite
      ? `${this.ownSessionId}_${this.session.sessionId}`
      : `${this.session.sessionId}_${this.ownSessionId}`;

    this.logger.log(
      `Creating connection ${this.connectionId} to ${session.sessionId} (${session.userId})`,
    );

    this.connection = new RTCPeerConnection({
      iceServers: [turnServer ?? { urls: [FALLBACK_ICE_SERVER] }],
      iceTransportPolicy: relay ? 'relay' : undefined,
    });

    // Statistics gathering
    this.statistics = {
      remoteSessionId: session.sessionId,
      remoteUserId: session.userId,
      impolite,
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0,
      connectionState: this.connection.connectionState,
      signalingState: this.connection.signalingState,
      iceConnectionState: this.connection.iceConnectionState,
      iceGatheringState: this.connection.iceGatheringState,
      dataChannelState: this.channel?.readyState,
    };

    interval(statisticsInterval)
      .pipe(
        takeUntil(this.destroySubject),
        switchMap(async () => await this.connection.getStats()),
      )
      .subscribe((report) => {
        this.updateStatistics(extractPeerConnectionStatistics(report));
      });

    fromEvent(this.connection, 'connectionstatechange')
      .pipe(takeUntil(this.destroySubject))
      .subscribe(() => {
        const { connectionState } = this.connection;

        this.logger.log(
          `Connection state of connection ${this.connectionId} changed: ${connectionState}`,
        );

        this.updateStatistics({ connectionState });
      });

    fromEvent(this.connection, 'signalingstatechange')
      .pipe(takeUntil(this.destroySubject))
      .subscribe(() => {
        const { signalingState } = this.connection;

        this.logger.log(
          `Signaling state of connection ${this.connectionId} changed: ${signalingState}`,
        );

        this.updateStatistics({ signalingState });
      });

    fromEvent(this.connection, 'icegatheringstatechange')
      .pipe(takeUntil(this.destroySubject))
      .subscribe(() => {
        const { iceGatheringState } = this.connection;

        this.logger.log(
          `ICE gathering state of connection ${this.connectionId} changed: ${iceGatheringState}`,
        );

        this.updateStatistics({ iceGatheringState });
      });

    fromEvent(this.connection, 'iceconnectionstatechange')
      .pipe(takeUntil(this.destroySubject))
      .subscribe(() => {
        const { iceConnectionState } = this.connection;

        this.logger.log(
          `ICE connection state of connection ${this.connectionId} changed: ${iceConnectionState}`,
        );

        this.updateStatistics({ iceConnectionState });

        if (iceConnectionState === 'failed') {
          // Establishing connection failed, we will retry
          this.connection.restartIce();
        }
      });

    fromEvent(this.connection, 'icecandidateerror')
      .pipe(takeUntil(this.destroySubject))
      .subscribe((error) => {
        this.logger.error(
          `ICE candidate error for connection ${this.connectionId}:`,
          error,
        );
      });

    if (impolite) {
      this.channel = this.connection.createDataChannel(DATA_CHANNEL_VERSION);
      this.initializeChannel();
    } else {
      fromEvent<RTCDataChannelEvent>(this.connection, 'datachannel')
        .pipe(takeUntil(this.destroySubject))
        .subscribe(({ channel }) => {
          if (channel.label !== DATA_CHANNEL_VERSION) {
            this.logger.warn(
              `Received unsupported data channel ${channel.label}`,
            );
            return;
          }

          this.channel = channel;
          this.initializeChannel();
        });
    }

    // Perfect negotiation implementation, see
    // https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Perfect_negotiation
    let makingOffer = false;
    let ignoreOffer = false;

    this.signalingChannel
      .observeSignaling(
        this.session.userId,
        this.ownSessionId,
        this.connectionId,
      )
      .pipe(
        takeUntil(this.destroySubject),
        switchMap(async ({ description, candidates }) => {
          try {
            if (description) {
              this.logger.log(
                `Received description for connection ${this.connectionId}`,
                description,
              );

              const offerCollision =
                description.type === 'offer' &&
                (makingOffer || this.connection.signalingState !== 'stable');

              ignoreOffer = impolite && offerCollision;

              if (ignoreOffer) {
                this.logger.log(
                  `Ignoring description offer for connection ${this.connectionId}`,
                );

                return;
              }

              await this.connection.setRemoteDescription(description);
              if (description.type === 'offer') {
                await this.connection.setLocalDescription();

                if (this.connection.localDescription) {
                  this.logger.log(
                    `Sending description answer for connection ${this.connectionId}`,
                    this.connection.localDescription,
                  );

                  await this.signalingChannel.sendDescription(
                    this.session.userId,
                    this.session.sessionId,
                    this.connectionId,
                    this.connection.localDescription,
                  );
                }
              }
            }

            if (candidates) {
              try {
                this.logger.log(
                  `Received candidates for connection ${this.connectionId}`,
                  candidates,
                );

                for (const candidate of candidates) {
                  if (candidate) {
                    await this.connection.addIceCandidate(candidate);
                  } else {
                    await this.connection.addIceCandidate();
                  }
                }
              } catch (err) {
                if (!ignoreOffer) {
                  throw err;
                }
              }
            }
          } catch (err) {
            this.logger.error(
              `Error while processing signaling message for connection ${this.connectionId}`,
              err,
            );
          }
        }),
      )
      .subscribe();

    // Trickle ICE allows for faster discovery, but will also cause a lot of
    // to device messages to be send. Therefore we batch together some
    // candidates that are dispatched in a short time window.
    const candidates = fromEvent(
      this.connection,
      'icecandidate',
      ({ candidate }: RTCPeerConnectionIceEvent) => candidate,
    ).pipe(takeUntil(this.destroySubject));
    candidates
      .pipe(
        buffer(
          // Either wait for some time, or till the last candidate is received
          race(
            interval(500),
            candidates.pipe(
              // Firefox uses empty string, while Chrome uses null
              filter((candidate) => !candidate || !candidate.candidate),
            ),
          ),
        ),
        filter((c) => c.length > 0),
      )
      .subscribe((candidates) => {
        this.logger.log(
          `Sending candidates for connection ${this.connectionId}`,
          candidates,
        );
        this.signalingChannel.sendCandidates(
          this.session.userId,
          this.session.sessionId,
          this.connectionId,
          candidates,
        );
      });

    fromEvent(this.connection, 'negotiationneeded')
      .pipe(
        takeUntil(this.destroySubject),
        switchMap(async () => {
          try {
            makingOffer = true;
            await this.connection.setLocalDescription();

            if (this.connection.localDescription) {
              this.logger.log(
                `Sending description offer for connection ${this.connectionId}`,
                this.connection.localDescription,
              );

              await this.signalingChannel.sendDescription(
                this.session.userId,
                this.session.sessionId,
                this.connectionId,
                this.connection.localDescription,
              );
            }
          } catch (err) {
            this.logger.log(
              `Error while sending description offer for connection ${this.connectionId}`,
              err,
            );
          } finally {
            makingOffer = false;
          }
        }),
      )
      .subscribe();
  }

  getRemoteSessionId(): string {
    return this.session.sessionId;
  }

  getConnectionId(): string {
    return this.connectionId;
  }

  // TODO: review this
  destroy(): void {
    this.connection.close();
    this.destroySubject.next();
    this.messageSubject.complete();
    this.statisticsSubject.complete();
  }

  close(): void {
    this.logger.log(
      `Closing connection ${this.connectionId} to ${this.session.sessionId} (${this.session.userId})`,
    );

    this.destroy();
  }

  sendMessage<T = unknown>(type: string, content: T): void {
    if (this.channel?.readyState === 'open') {
      const message = { type, content };
      const data = JSON.stringify(message);
      this.channel.send(data);
    }
  }

  observeMessages(): Observable<Message> {
    return this.messageSubject;
  }

  observeStatistics(): Observable<PeerConnectionStatistics> {
    return concat(of(this.statistics), this.statisticsSubject);
  }

  observeConnectionState(): Observable<string> {
    throw new Error('not implemented');
  }

  private updateStatistics(update: Partial<PeerConnectionStatistics>): void {
    if (Object.keys(update).length > 0) {
      Object.assign(this.statistics, update);

      this.statisticsSubject.next(clone(this.statistics));
    }
  }

  private initializeChannel() {
    if (!this.channel) {
      throw new Error('Channel not initialized');
    }

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
  }
}
