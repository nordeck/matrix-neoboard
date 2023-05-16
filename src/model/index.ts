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

export {
  isValidConnectionSignalingMessage,
  TO_DEVICE_MESSAGE_CONNECTION_SIGNALING,
} from './connectionSignaling';
export type {
  Candidate,
  ConnectionSignaling,
  Description,
} from './connectionSignaling';
export {
  isValidDocumentChunkRoomEvent,
  ROOM_EVENT_DOCUMENT_CHUNK,
} from './documentChunk';
export type { DocumentChunk } from './documentChunk';
export { ROOM_EVENT_DOCUMENT_CREATE } from './documentCreate';
export type { DocumentCreate } from './documentCreate';
export {
  isValidDocumentSnapshotRoomEvent,
  ROOM_EVENT_DOCUMENT_SNAPSHOT,
} from './documentSnapshot';
export type { DocumentSnapshot } from './documentSnapshot';
export { isValidRoomNameEvent, STATE_EVENT_ROOM_NAME } from './roomNameEvent';
export type { RoomNameEvent } from './roomNameEvent';
export {
  isValidWhiteboardStateEvent,
  STATE_EVENT_WHITEBOARD,
} from './whiteboard';
export type { Whiteboard } from './whiteboard';
export {
  isNotExpired,
  isValidWhiteboardSessionsStateEvent,
  STATE_EVENT_WHITEBOARD_SESSIONS,
} from './whiteboardSessions';
export type {
  WhiteboardSession,
  WhiteboardSessions,
} from './whiteboardSessions';
