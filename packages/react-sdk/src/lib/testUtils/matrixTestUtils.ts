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

import {
  PowerLevelsStateEvent,
  RoomEvent,
  RoomMemberStateEventContent,
  StateEvent,
  ToDeviceMessageEvent,
} from '@matrix-widget-toolkit/api';
import {
  Candidate,
  ConnectionSignaling,
  Description,
  DocumentChunk,
  DocumentCreate,
  DocumentSnapshot,
  RoomNameEvent,
  RTCSessionEventContent,
  STATE_EVENT_RTC_MEMBER,
  Whiteboard,
  WhiteboardSession,
  WhiteboardSessions,
} from '../../model';
import {
  createWhiteboardDocument,
  Document,
  generateAddElement,
  generateAddSlide,
  WhiteboardDocument,
} from '../../state';
import { createChunks } from '../../store/api/documentSnapshotApi';

/**
 * Create a matrix room member event with known test data.
 *
 * @remarks Only use for tests
 */
export function mockRoomMember({
  state_key = '@user-alice',
  event_id = '$event-id-0',
  content = {},
}: {
  state_key?: string;
  event_id?: string;
  content?: Partial<RoomMemberStateEventContent>;
} = {}): StateEvent<RoomMemberStateEventContent> {
  return {
    type: 'm.room.member',
    sender: '@user-id',
    content: {
      membership: 'join',
      displayname: 'Alice',
      avatar_url: 'mxc://alice.png',
      ...content,
    },
    state_key,
    origin_server_ts: 0,
    event_id,
    room_id: '!room-id',
  };
}

/**
 * Create a matrix power levels event with known test data.
 *
 * @remarks Only use for tests
 */
export function mockPowerLevelsEvent({
  content = {},
}: {
  content?: Partial<PowerLevelsStateEvent>;
} = {}): StateEvent<PowerLevelsStateEvent> {
  return {
    type: 'm.room.power_levels',
    sender: '@user-id',
    content: {
      users_default: 100,
      ...content,
    },
    state_key: '',
    origin_server_ts: 0,
    event_id: '$event-id-0',
    room_id: '!room-id',
  };
}

/**
 * Create a matrix room name event with known test data.
 *
 * @remarks Only use for tests
 */
export function mockRoomName({
  room_id = '!room-id',
  content = {},
}: {
  room_id?: string;
  content?: Partial<RoomNameEvent>;
} = {}): StateEvent<RoomNameEvent> {
  return {
    type: 'm.room.name',
    sender: '',
    content: {
      name: 'My Room',
      ...content,
    },
    state_key: room_id,
    origin_server_ts: 0,
    event_id: '$event-id-0',
    room_id,
  };
}

/**
 * Create a matrix room member event with known test data.
 *
 * @remarks Only use for tests
 */
export function mockWhiteboard({
  sender = '@user-id',
  state_key = 'whiteboard-0',
  event_id = '$event-id-0',
  content = {},
  origin_server_ts = 0,
}: {
  sender?: string;
  state_key?: string;
  event_id?: string;
  content?: Partial<Whiteboard>;
  origin_server_ts?: number;
} = {}): StateEvent<Whiteboard> {
  return {
    type: 'net.nordeck.whiteboard',
    sender,
    content: {
      documentId: '$document-event-id',
      ...content,
    },
    state_key,
    origin_server_ts,
    event_id,
    room_id: '!room-id',
  };
}

/**
 * Create a document create event with known test data.
 *
 * @remarks Only use for tests
 */
export function mockDocumentCreate({
  sender = '@user-id',
  event_id = '$document-0',
  content = {},
  origin_server_ts = 0,
}: {
  sender?: string;
  event_id?: string;
  content?: Partial<DocumentCreate>;
  origin_server_ts?: number;
} = {}): RoomEvent<DocumentCreate> {
  return {
    type: 'net.nordeck.whiteboard.document.create',
    sender,
    content: {
      ...content,
    },
    origin_server_ts,
    event_id,
    room_id: '!room-id',
  };
}

/**
 * Create a document snapshot event with known test data.
 *
 * @remarks Only use for tests
 */
export function mockDocumentSnapshot({
  event_id = '$document-snapshot-0',
  documentId = '$document-0',
  document,
  chunkCount = 1,
  chunkOriginServerTs,
  content = {},
  origin_server_ts = 0,
  room_id = '!room-id',
}: {
  event_id?: string;
  documentId?: string;
  document?: Document<Record<string, unknown>>;
  chunkCount?: number;
  chunkOriginServerTs?: number[];
  content?: Partial<DocumentSnapshot>;
  origin_server_ts?: number;
  room_id?: string;
} = {}): {
  snapshot: RoomEvent<DocumentSnapshot>;
  chunks: Array<RoomEvent<DocumentChunk>>;
} {
  const snapshot: RoomEvent<DocumentSnapshot> = {
    type: 'net.nordeck.whiteboard.document.snapshot',
    sender: '@user-id',
    content: {
      chunkCount,
      'm.relates_to': {
        rel_type: 'm.reference',
        event_id: documentId,
      },
      ...content,
    },
    origin_server_ts,
    event_id,
    room_id,
  };

  let chunks: Array<RoomEvent<DocumentChunk>> = [];
  if (document) {
    const data = document.store();

    chunks = createChunks(data, chunkCount).map(({ i, data: chunkData }) => {
      return mockDocumentChunk({
        event_id: `${event_id}-chunk-${i}`,
        snapshot_event_id: event_id,
        content: {
          documentId,
          sequenceNumber: i,
          data: chunkData,
        },
        origin_server_ts: chunkOriginServerTs?.[i] ?? origin_server_ts + i,
        room_id,
      });
    });
  }

  return { snapshot, chunks };
}

/**
 * Create a document chunk event with known test data.
 *
 * @remarks Only use for tests
 */
export function mockDocumentChunk({
  event_id = '$document-chunk-0',
  snapshot_event_id = '$document-snapshot-0',
  content = {},
  origin_server_ts = 0,
  room_id = '!room-id',
}: {
  event_id?: string;
  snapshot_event_id?: string;
  content?: Partial<DocumentChunk>;
  origin_server_ts?: number;
  room_id?: string;
} = {}): RoomEvent<DocumentChunk> {
  return {
    type: 'net.nordeck.whiteboard.document.chunk',
    sender: '@user-id',
    content: {
      documentId: '$document-0',
      sequenceNumber: 0,
      data: '',
      'm.relates_to': {
        rel_type: 'm.reference',
        event_id: snapshot_event_id,
      },
      ...content,
    },
    origin_server_ts,
    event_id,
    room_id,
  };
}

/**
 * Create a signaling message containing candidates.
 *
 * @remarks Only use for tests
 */
export function mockConnectionSignalingCandidates({
  candidates = [
    {
      candidate:
        'candidate:702786350 2 udp 41819902 8.8.8.8 60769 typ relay raddr 8.8.8.8',
      sdpMLineIndex: null,
      sdpMid: null,
      usernameFragment: null,
    },
    {
      candidate:
        'candidate:635070278 2 udp 99024181 8.8.8.8 60769 typ relay raddr 8.8.8.8',
      sdpMLineIndex: null,
      sdpMid: null,
      usernameFragment: null,
    },
    null,
  ],
  sender = '@peer-user-id',
  sessionId = '@session-id',
  connectionId = '@connection-id',
}: {
  sender?: string;
  sessionId?: string;
  connectionId?: string;
  candidates?: (Candidate | null)[];
} = {}): ToDeviceMessageEvent<ConnectionSignaling> {
  return {
    type: 'net.nordeck.whiteboard.connection_signaling',
    content: {
      sessionId,
      connectionId,
      candidates,
    },
    encrypted: false,
    sender,
  };
}

/**
 * Create a signaling message containing a description.
 *
 * @remarks Only use for tests
 */
export function mockConnectionSignalingDescription({
  description = {},
  sender = '@peer-user-id',
  sessionId = '@session-id',
  connectionId = '@connection-id',
  encrypted = false,
}: {
  sender?: string;
  sessionId?: string;
  connectionId?: string;
  description?: Partial<Description>;
  encrypted?: boolean;
} = {}): ToDeviceMessageEvent<ConnectionSignaling> {
  return {
    type: 'net.nordeck.whiteboard.connection_signaling',
    content: {
      sessionId,
      connectionId,
      description: {
        type: 'offer',
        sdp: 'sdp',
        ...description,
      },
    },
    encrypted,
    sender,
  };
}

/**
 * Create a whiteboard sessions state event.
 *
 * @remarks Only use for tests
 */
export function mockWhiteboardSessions({
  sessions = [
    {
      expiresTs: +new Date('2050-01-12T11:25:20.143Z'),
      sessionId: 'session-id',
      whiteboardId: 'whiteboard-id',
    },
  ],
  state_key = '@user-id',
  origin_server_ts = 0,
}: {
  sessions?: WhiteboardSession[];
  state_key?: string;
  origin_server_ts?: number;
} = {}): StateEvent<WhiteboardSessions> {
  return {
    type: 'net.nordeck.whiteboard.sessions',
    sender: '@user-id',
    content: {
      sessions,
    },
    state_key,
    origin_server_ts,
    event_id: '$event-id-0',
    room_id: '!room-id',
  };
}

/**
 * Create a whiteboard membership state event.
 *
 * @remarks Only use for tests
 */
export function mockWhiteboardMembership({
  content = {
    application: 'net.nordeck.whiteboard',
    call_id: 'whiteboard-id',
    device_id: 'DEVICEID',
    foci_preferred: [],
    focus_active: { type: 'livekit', livekit_service_url: '' },
    created_ts: new Date('2023-02-01T10:11:12.345Z').getTime(),
    scope: 'm.room',
    expires: +new Date('2050-01-12T11:25:20.143Z').getTime(),
  },
  state_key = '_@user-id_DEVICEID',
  sender = '@user-id',
  origin_server_ts = 0,
}: {
  content?: RTCSessionEventContent | Partial<RTCSessionEventContent>;
  state_key?: string;
  sender?: string;
  origin_server_ts?: number;
} = {}): StateEvent<RTCSessionEventContent> {
  return {
    type: STATE_EVENT_RTC_MEMBER,
    sender,
    content: content as RTCSessionEventContent,
    state_key,
    origin_server_ts,
    event_id: '$event-id-0',
    room_id: '!room-id',
  };
}

/**
 * Create a whiteboard document with known test data.
 *
 * @remarks Only use for tests
 */
export function mockWhiteboardDocumentSnapshot(): Document<WhiteboardDocument> {
  const document = createWhiteboardDocument();

  const [addSlide, slideId] = generateAddSlide();
  document.performChange(addSlide);

  const [addElement] = generateAddElement(slideId, {
    type: 'shape',
    kind: 'ellipse',
    position: { x: 0, y: 1 },
    fillColor: 'red',
    textFontFamily: 'Inter',
    height: 100,
    width: 50,
    text: '',
  });
  document.performChange(addElement);

  return document;
}
