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

import { ConnectionState, RoomEvent } from 'livekit-client';
import { bufferTime, firstValueFrom, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MockLivekitRoom,
  mockLivekitRoom,
} from '../../../lib/testUtils/matrixRtcMock';
import { Session } from '../discovery';
import { SFUConfig } from '../matrixRtcCommunicationChannel';
import { MatrixRtcPeerConnection } from './matrixRtcPeerConnection';

describe('MatrixRtcPeerConnection', () => {
  let mockRoom: MockLivekitRoom;
  const session: Session = { sessionId: 'session-a', userId: '@user-id' };
  const sfuConfig: SFUConfig = {
    url: 'wss://livekit-server',
    jwt: 'dummy-jwt',
  };

  beforeEach(() => {
    vi.stubEnv('REACT_APP_RTC', 'matrixrtc');
    mockRoom = mockLivekitRoom();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should try to connect to LiveKit on creation', async () => {
    const connection = new MatrixRtcPeerConnection(session, sfuConfig);
    const spy = vi.spyOn(connection.room, 'connect');

    await vi.waitFor(() =>
      expect(spy).toHaveBeenCalledWith('wss://livekit-server', 'dummy-jwt'),
    );

    connection.close();
  });

  it('should close connection', async () => {
    const connection = new MatrixRtcPeerConnection(session, sfuConfig);

    const statisticsPromise = firstValueFrom(
      connection.observeStatistics().pipe(toArray()),
    );
    const messagesPromise = firstValueFrom(
      connection.observeMessages().pipe(toArray()),
    );

    connection.close();

    await expect(statisticsPromise).resolves.toEqual(expect.any(Array));
    await expect(messagesPromise).resolves.toEqual([]);
  });

  describe('common', () => {
    let connection: MatrixRtcPeerConnection;

    beforeEach(() => {
      connection = new MatrixRtcPeerConnection(session, sfuConfig);

      Object.defineProperty(connection, 'room', {
        value: mockRoom,
        writable: false,
      });

      mockRoom.eventEmitter.on(RoomEvent.DataReceived, (...args) => {
        connection.handleDataReceived(args[0], args[1]);
      });

      expect(connection.room).toBe(mockRoom);
    });

    afterEach(() => {
      connection.close();
    });

    it('should send message', () => {
      mockRoom.setConnectionState(ConnectionState.Connected);

      connection.sendMessage('com.example.test', { key: 'value' });

      expect(mockRoom.localParticipant.publishData).toHaveBeenCalledOnce();
    });

    it('should receive message', async () => {
      mockRoom.setConnectionState(ConnectionState.Connected);

      const messagePromise = firstValueFrom(connection.observeMessages());

      const validMessageData = {
        type: 'com.example.test',
        content: { key: 'value', nested: { prop: true } },
      };

      const encodedData = new TextEncoder().encode(
        JSON.stringify(validMessageData),
      );

      const mockParticipant = {
        identity: '@remote-user-id',
        sid: 'remote-session-id',
      };

      mockRoom.emitEvent(RoomEvent.DataReceived, encodedData, mockParticipant);

      await expect(messagePromise).resolves.toEqual({
        type: 'com.example.test',
        content: { key: 'value', nested: { prop: true } },
        senderSessionId: 'session-a',
        senderUserId: '@remote-user-id',
      });
    });

    it('should ignore invalid payload JSON', async () => {
      mockRoom.setConnectionState(ConnectionState.Connected);

      const messagePromise = firstValueFrom(
        connection.observeMessages().pipe(bufferTime(100)),
      );

      const mockParticipant = {
        identity: '@remote-user-id',
        sid: 'remote-session-id',
      };

      mockRoom.emitEvent(
        RoomEvent.DataReceived,
        'invalid-data',
        mockParticipant,
      );

      await expect(messagePromise).resolves.toEqual([]);
    });

    it('should ignore invalid payload schema', async () => {
      mockRoom.setConnectionState(ConnectionState.Connected);

      const messagePromise = firstValueFrom(
        connection.observeMessages().pipe(bufferTime(100)),
      );

      const mockParticipant = {
        identity: '@remote-user-id',
        sid: 'remote-session-id',
      };

      mockRoom.emitEvent(RoomEvent.DataReceived, '{}', mockParticipant);

      await expect(messagePromise).resolves.toEqual([]);
    });
  });

  describe('statistics and connection state', () => {
    let connection: MatrixRtcPeerConnection;

    beforeEach(() => {
      connection = new MatrixRtcPeerConnection(session, sfuConfig);

      Object.defineProperty(connection, 'room', {
        value: mockRoom,
        writable: false,
      });

      mockRoom.eventEmitter.on(RoomEvent.ConnectionStateChanged, (...args) => {
        connection.updateStatistics({ connectionState: args[0] });
      });

      expect(connection.room).toBe(mockRoom);
    });

    afterEach(() => {
      connection.close();
    });

    it('should handle connection state changes', async () => {
      const connectionStates: string[] = [];
      const subscription = connection.observeStatistics().subscribe((stats) => {
        connectionStates.push(stats.connectionState as string);
      });

      mockRoom.setConnectionState(ConnectionState.Connected);
      await vi.waitFor(() => {
        expect(connectionStates).toContain('connected');
      });

      mockRoom.setConnectionState(ConnectionState.Disconnected);
      await vi.waitFor(() => {
        expect(connectionStates).toContain('disconnected');
      });

      subscription.unsubscribe();
    });
  });
});
