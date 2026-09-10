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
  RemoteParticipant,
  Room,
  RoomEvent,
} from 'livekit-client';
import { Mocked, vi } from 'vitest';

export type MockLivekitRoom = Mocked<Room> & {
  setConnectionState: (state: ConnectionState) => void;
  emitEvent: (event: RoomEvent, ...args: unknown[]) => void;
};

export function mockLocalParticipant({
  identity = 'vtdiVgWoeLb2NR7dph94uv/R4+U6uQTmCYE9Q0BlgUw',
}: { identity?: string } = {}): Mocked<LocalParticipant> {
  return {
    identity,
    publishData: vi.fn(),
  } as Partial<LocalParticipant> as Mocked<LocalParticipant>;
}

export function mockLivekitRoom({
  localParticipant = mockLocalParticipant(),
  remoteParticipants = new Map<string, RemoteParticipant>(),
}: {
  localParticipant?: Mocked<LocalParticipant>;
  remoteParticipants?: Map<string, RemoteParticipant>;
} = {}): MockLivekitRoom {
  const eventEmitter = new EventEmitter();

  const room = {
    connect: vi.fn(),
    disconnect: vi.fn(),

    on: vi.fn((event, listener) => {
      eventEmitter.on(event, listener);
      return room;
    }),
    off: vi.fn((event, listener) => {
      eventEmitter.off(event, listener);
      return room;
    }),
    once: vi.fn((event, listener) => {
      eventEmitter.once(event, listener);
      return room;
    }),

    state: ConnectionState.Disconnected,
    localParticipant,
    remoteParticipants,
  } as Partial<Room> as Mocked<Room>;

  return Object.assign(room, {
    setConnectionState: (state: ConnectionState) => {
      room.state = state;
      eventEmitter.emit(RoomEvent.ConnectionStateChanged, state);
    },
    emitEvent: (event: RoomEvent, ...args: unknown[]) => {
      eventEmitter.emit(event, ...args);
    },
  });
}
