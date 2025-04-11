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

import EventEmitter from 'events';
import {
  ConnectionState,
  LocalParticipant,
  Participant,
  Room,
  RoomEvent,
} from 'livekit-client';
import { Mocked, vi } from 'vitest';

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
