/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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
import { Message, PeerConnectionStatistics } from './connection';
import { SessionState } from './discovery/sessionManagerImpl';

export type { Message, PeerConnectionStatistics } from './connection';

export type CommunicationChannelStatistics = {
  /** The local session id, if connected. */
  localSessionId?: string;
  /** Statistics for each peer connection, indexed by the connection id. */
  peerConnections: Record<string, PeerConnectionStatistics>;
  /**All sessions */
  sessions?: SessionState[];
};

export function emptyCommunicationChannelStatistics(): CommunicationChannelStatistics {
  return {
    peerConnections: {},
    sessions: [],
  };
}

export type CommunicationChannel = {
  /** Sends a message to all connected peers. */
  broadcastMessage<T = unknown>(type: string, content: T): void;
  /** Observe messages from all connected peers. */
  observeMessages(): Observable<Message>;

  /** Get the current statistics. */
  getStatistics(): CommunicationChannelStatistics;
  /** Observe statistics. */
  observeStatistics(): Observable<CommunicationChannelStatistics>;

  /** Destroys the communication channel and disconnect all peers. */
  destroy(): void;
};
