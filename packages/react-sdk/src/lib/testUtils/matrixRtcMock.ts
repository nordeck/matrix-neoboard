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

import { StateEvent } from '@matrix-widget-toolkit/api';
import EventEmitter from 'events';
import {
  ConnectionState,
  LocalParticipant,
  Participant,
  Room,
  RoomEvent,
} from 'livekit-client';
import { Mocked, vi } from 'vitest';
import { RTCSessionEventContent } from '../../model';
import {
  RTC_APPLICATION_WHITEBOARD,
  STATE_EVENT_RTC_MEMBER,
} from '../../model/matrixRtcSessions';

export type MockLocalParticipant = Mocked<LocalParticipant> & {
  emitEvent: (event: string, ...args: unknown[]) => void;
};

export type MockLivekitRoom = Mocked<Room> & {
  eventEmitter: EventEmitter;
  setConnectionState: (state: ConnectionState) => void;
  emitEvent: (event: RoomEvent, ...args: unknown[]) => void;
};

export function mockLocalParticipant(): MockLocalParticipant {
  const eventEmitter = new EventEmitter();

  const mockParticipant = {
    publishData: vi.fn().mockResolvedValue(undefined),
    identity: 'local-participant',
    sid: 'local-participant-sid',
    metadata: '',
    name: 'Local User',
    on: vi.fn((event, listener) => {
      eventEmitter.on(event, listener);
      return mockParticipant;
    }),
    off: vi.fn((event, listener) => {
      eventEmitter.off(event, listener);
      return mockParticipant;
    }),
    once: vi.fn((event, listener) => {
      eventEmitter.once(event, listener);
      return mockParticipant;
    }),
    removeListener: vi.fn((event, listener) => {
      eventEmitter.removeListener(event, listener);
      return mockParticipant;
    }),
    emit: vi.fn((event, ...args) => eventEmitter.emit(event, ...args)),
    emitEvent: (event: string, ...args: unknown[]) => {
      eventEmitter.emit(event, ...args);
    },
  } as unknown as MockLocalParticipant;

  return mockParticipant;
}

export function mockLivekitRoom(): MockLivekitRoom {
  const eventEmitter = new EventEmitter();
  let connectionState: ConnectionState = ConnectionState.Disconnected;
  const localParticipant = mockLocalParticipant();
  const participants = new Map<string, Participant>();

  const mockRoom = {
    connect: vi
      .fn()
      .mockImplementation(async (_url: string, _token: string) => {
        mockRoom.setConnectionState(ConnectionState.Connecting);
        setTimeout(() => {
          mockRoom.setConnectionState(ConnectionState.Connected);
          mockRoom.emitEvent(RoomEvent.Connected);
        }, 10);
        return Promise.resolve();
      }),
    disconnect: vi.fn().mockImplementation(() => {
      mockRoom.setConnectionState(ConnectionState.Disconnected);
      mockRoom.emitEvent(RoomEvent.Disconnected);
    }),

    on: vi.fn((event, listener) => {
      eventEmitter.on(event, listener);
      return mockRoom;
    }),
    off: vi.fn((event, listener) => {
      eventEmitter.off(event, listener);
      return mockRoom;
    }),
    once: vi.fn((event, listener) => {
      eventEmitter.once(event, listener);
      return mockRoom;
    }),

    state: connectionState,
    localParticipant,
    participants,

    eventEmitter,
    setConnectionState: (state: ConnectionState) => {
      connectionState = state;
      mockRoom.state = state;
      mockRoom.emitEvent(RoomEvent.ConnectionStateChanged, state);
    },
    emitEvent: (event: RoomEvent, ...args: unknown[]) => {
      eventEmitter.emit(event, ...args);
    },
  } as unknown as MockLivekitRoom;

  return mockRoom;
}

/**
 * Create a whiteboard membership state event.
 *
 * @remarks Only use for tests
 */
export function mockWhiteboardMembership(
  {
    content = {},
    state_key = '_@user-id_DEVICEID',
    sender = '@user-id',
    origin_server_ts = 0,
  }: {
    content?: RTCSessionEventContent | Partial<RTCSessionEventContent>;
    state_key?: string;
    sender?: string;
    origin_server_ts?: number;
  } = {},
  overrideContent: boolean = false,
): StateEvent<RTCSessionEventContent> {
  const defaultContent: RTCSessionEventContent = {
    application: RTC_APPLICATION_WHITEBOARD,
    call_id: 'whiteboard-id',
    device_id: 'DEVICEID',
    focus_active: {
      type: 'livekit',
      focus_selection: 'oldest_membership',
    },
    foci_preferred: [
      {
        type: 'livekit',
        livekit_service_url: 'https://livekit.example.com',
      },
    ],
    scope: 'm.room',
    expires: +new Date('2050-01-12T11:25:20.143Z').getTime(),
  };

  return {
    type: STATE_EVENT_RTC_MEMBER,
    sender,
    content: overrideContent
      ? (content as RTCSessionEventContent)
      : { ...defaultContent, ...content },
    state_key,
    origin_server_ts,
    event_id: '$event-id-0',
    room_id: '!room-id',
  };
}
