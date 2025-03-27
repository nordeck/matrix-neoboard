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
  TO_DEVICE_MESSAGE_CONNECTION_SIGNALING,
  isValidConnectionSignalingMessage,
} from './connectionSignaling';
export type {
  Candidate,
  ConnectionSignaling,
  Description,
} from './connectionSignaling';
export {
  ROOM_EVENT_DOCUMENT_CHUNK,
  isValidDocumentChunkRoomEvent,
} from './documentChunk';
export type { DocumentChunk } from './documentChunk';
export { ROOM_EVENT_DOCUMENT_CREATE } from './documentCreate';
export type { DocumentCreate } from './documentCreate';
export {
  ROOM_EVENT_DOCUMENT_SNAPSHOT,
  isValidDocumentSnapshotRoomEvent,
} from './documentSnapshot';
export type { DocumentSnapshot } from './documentSnapshot';
export {
  STATE_EVENT_RTC_MEMBER,
  isRTCSessionNotExpired,
  isValidRTCSessionStateEvent,
  newRTCSession,
} from './matrixRtcSessions';
export type { RTCSessionEventContent } from './matrixRtcSessions';
export { STATE_EVENT_ROOM_NAME, isValidRoomNameEvent } from './roomNameEvent';
export type { RoomNameEvent } from './roomNameEvent';
export {
  STATE_EVENT_WHITEBOARD,
  isValidWhiteboardStateEvent,
} from './whiteboard';
export type { Whiteboard } from './whiteboard';
export {
  STATE_EVENT_WHITEBOARD_SESSIONS,
  isNotExpired,
  isValidWhiteboardSessionsStateEvent,
} from './whiteboardSessions';
export type {
  WhiteboardSession,
  WhiteboardSessions,
} from './whiteboardSessions';
