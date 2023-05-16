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

export type Session = { userId: string; sessionId: string };

export type SessionManager = {
  /** Gets the current session id, if joined. */
  getSessionId(): string | undefined;
  /** Gets a list of all active sessions, excluding the own session. */
  getSessions(): Session[];
  /**
   * Observes new sessions that joined the current whiteboard.
   * Is never triggered for the own session.
   */
  observeSessionJoined(): Observable<Session>;
  /**
   * Observes sessions that left the current whiteboard, like expired
   * sessions.
   * Is never triggered for the own session.
   */
  observeSessionLeft(): Observable<Session>;
  /**
   * Join a whiteboard session.
   * Session join and leave events are related to the joined whiteboard.
   */
  join(whiteboardId: string): Promise<{ sessionId: string }>;
  /**
   * Leaves the current whiteboard.
   */
  leave(): Promise<void>;
  /**
   * Stops the session manager.
   * Does not leave the whiteboard, call leave first!
   */
  destroy(): void;
};
