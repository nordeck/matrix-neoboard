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

export type SignalingChannel = {
  /** Sends ICE candidates to the other peer. */
  sendCandidates(
    userId: string,
    sessionId: string,
    connectionId: string,
    candidates: (RTCIceCandidate | null)[]
  ): Promise<void>;
  /** Sends the session description to the other peer. */
  sendDescription(
    userId: string,
    sessionId: string,
    connectionId: string,
    description: RTCSessionDescription
  ): Promise<void>;
  /**
   * Observable to receive session descriptions and ICE candidates from the
   * other peer.
   */
  observeSignaling(
    userId: string,
    sessionId: string,
    connectionId: string
  ): Observable<{
    description?: RTCSessionDescription;
    candidates?: (RTCIceCandidate | null)[];
  }>;
  /** Stops the signaling channel. */
  destroy(): void;
};
