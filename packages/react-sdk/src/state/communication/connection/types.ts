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

import { Observable } from 'rxjs';

export type Message<T = unknown> = {
  type: string;
  senderSessionId: string;
  senderUserId: string;
  content: T;
};

export type PeerConnectionStatistics = {
  remoteUserId: string;
  remoteSessionId: string;
  impolite: boolean;
  packetsReceived: number;
  bytesReceived: number;
  packetsSent: number;
  bytesSent: number;
  connectionState: string;
  signalingState: string;
  iceConnectionState: string;
  iceGatheringState: string;
  dataChannelState?: string;
  localCandidateType?: string;
  remoteCandidateType?: string;
};

export type PeerConnection = {
  /** Get the remote session id for this connection */
  getRemoteSessionId(): string;
  /** Get the id of the connection */
  getConnectionId(): string;
  /** Close the connection. */
  close(): void;
  /** Send a message with a type using the connection. */
  sendMessage<T = unknown>(type: string, content: T): void;
  /**
   * Returns an observable that contains all incoming messages on this
   * connection.
   */
  observeMessages(): Observable<Message>;
  /**
   * Returns an observable that regularly returns statistics about the
   * connection.
   */
  observeStatistics(): Observable<PeerConnectionStatistics>;
  /**
   * Returns an observable that emits when the connection state changes.
   */
  observeConnectionState(): Observable<string>;
};
