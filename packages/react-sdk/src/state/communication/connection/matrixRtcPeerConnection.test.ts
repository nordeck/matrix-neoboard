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

import {
  ConnectionState,
  RemoteParticipant,
  Room,
  RoomEvent,
} from 'livekit-client';
import { firstValueFrom, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MockLivekitRoom,
  mockLivekitRoom,
} from '../../../lib/testUtils/livekitMock';
import { MatrixRtcPeerConnection } from './matrixRtcPeerConnection';

vi.mock('livekit-client', async () => ({
  ...(await vi.importActual('livekit-client')),
  Room: vi.fn(),
}));

describe('MatrixRtcPeerConnection', () => {
  let remoteParticipants: Map<string, RemoteParticipant>;
  let mockRoom: MockLivekitRoom;
  let livekitServiceUrl: string;
  let livekitUrl: string;
  let livekitToken: string;
  let getUserId: (sessionId: string) => string | undefined;

  beforeEach(() => {
    remoteParticipants = new Map<string, RemoteParticipant>();
    mockRoom = mockLivekitRoom({
      remoteParticipants,
    });
    livekitServiceUrl = 'https://livekit-jwt.example.com';
    livekitUrl = 'wss://livekit-server';
    livekitToken = 'dummy-jwt';
    getUserId = vi.fn().mockImplementation((sessionId) => {
      if (sessionId === 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0') {
        return '@another-user-id:example.com';
      } else if (sessionId === 'J+T45tGruxc+HrUOqJJlyQSV33m728Cme4+vt8/SWrU') {
        return '@alice:example.com';
      }

      return undefined;
    });
    vi.mocked(Room).mockImplementation(() => mockRoom);
  });

  it('should connect on creation', async () => {
    const connection = new MatrixRtcPeerConnection(
      livekitServiceUrl,
      livekitUrl,
      livekitToken,
      getUserId,
    );
    expect(mockRoom.connect).toHaveBeenCalledOnce();

    connection.close();
  });

  it('should close connection', async () => {
    const connection = new MatrixRtcPeerConnection(
      livekitServiceUrl,
      livekitUrl,
      livekitToken,
      getUserId,
    );

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
      connection = new MatrixRtcPeerConnection(
        livekitServiceUrl,
        livekitUrl,
        livekitToken,
        getUserId,
      );
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

      const message = {
        type: 'com.example.test',
        content: { key: 'value', nested: { prop: true } },
      };

      const encodedData = new TextEncoder().encode(JSON.stringify(message));

      const participant: Partial<RemoteParticipant> = {
        identity: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
      };

      mockRoom.emitEvent(RoomEvent.DataReceived, encodedData, participant);

      await expect(messagePromise).resolves.toEqual({
        senderSessionId: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
        senderUserId: '@another-user-id:example.com',
        type: 'com.example.test',
        content: { key: 'value', nested: { prop: true } },
      });
    });

    it('should ignore message if no session for participant identity', async () => {
      mockRoom.setConnectionState(ConnectionState.Connected);

      const messagePromise = firstValueFrom(connection.observeMessages());

      const message = {
        type: 'com.example.test',
        content: { key: 'value', nested: { prop: true } },
      };

      const encodedData = new TextEncoder().encode(JSON.stringify(message));

      mockRoom.emitEvent(RoomEvent.DataReceived, encodedData, {
        identity: 'unexpected-identity',
      });
      mockRoom.emitEvent(RoomEvent.DataReceived, encodedData, {
        identity: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
      });

      await expect(messagePromise).resolves.toEqual({
        senderSessionId: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
        senderUserId: '@another-user-id:example.com',
        type: 'com.example.test',
        content: { key: 'value', nested: { prop: true } },
      });
    });

    it('should ignore message if invalid', async () => {
      mockRoom.setConnectionState(ConnectionState.Connected);

      const messagePromise = firstValueFrom(connection.observeMessages());

      mockRoom.emitEvent(RoomEvent.DataReceived, 'invalid-data', {
        identity: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
      });

      const message = {
        type: 'com.example.test',
        content: { key: 'value', nested: { prop: true } },
      };

      const encodedData = new TextEncoder().encode(JSON.stringify(message));

      mockRoom.emitEvent(RoomEvent.DataReceived, encodedData, {
        identity: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
      });

      await expect(messagePromise).resolves.toEqual({
        senderSessionId: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
        senderUserId: '@another-user-id:example.com',
        type: 'com.example.test',
        content: { key: 'value', nested: { prop: true } },
      });
    });

    it('should ignore invalid payload schema', async () => {
      mockRoom.setConnectionState(ConnectionState.Connected);

      const messagePromise = firstValueFrom(connection.observeMessages());

      mockRoom.emitEvent(RoomEvent.DataReceived, '{}', {
        identity: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
      });

      const message = {
        type: 'com.example.test',
        content: { key: 'value', nested: { prop: true } },
      };

      const encodedData = new TextEncoder().encode(JSON.stringify(message));

      mockRoom.emitEvent(RoomEvent.DataReceived, encodedData, {
        identity: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
      });

      await expect(messagePromise).resolves.toEqual({
        senderSessionId: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
        senderUserId: '@another-user-id:example.com',
        type: 'com.example.test',
        content: { key: 'value', nested: { prop: true } },
      });
    });
  });

  describe('statistics', () => {
    let connection: MatrixRtcPeerConnection;

    beforeEach(() => {
      const identity = 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0';
      const participant: Partial<RemoteParticipant> = {
        identity,
      };
      remoteParticipants.set(identity, participant as RemoteParticipant);

      mockRoom.emitEvent(RoomEvent.ParticipantConnected, participant);

      connection = new MatrixRtcPeerConnection(
        livekitServiceUrl,
        livekitUrl,
        livekitToken,
        getUserId,
      );
    });

    afterEach(() => {
      connection.close();
    });

    it('should connect on creation and emit statistics with remote identity and participants', async () => {
      const statisticsPromise = firstValueFrom(connection.observeStatistics());

      await expect(statisticsPromise).resolves.toMatchObject({
        localParticipantIdentity: 'vtdiVgWoeLb2NR7dph94uv/R4+U6uQTmCYE9Q0BlgUw',
        remoteParticipantIdentities: [
          'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
        ],
      });
    });

    it('should handle connection state changes', async () => {
      const connectionStates: string[] = [];
      const subscription = connection.observeStatistics().subscribe((stats) => {
        connectionStates.push(stats.connectionState);
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

    it('should handle remote participants changes', async () => {
      const statisticsPromise = firstValueFrom(connection.observeStatistics());

      const identity = 'J+T45tGruxc+HrUOqJJlyQSV33m728Cme4+vt8/SWrU';
      const participant: Partial<RemoteParticipant> = {
        identity,
      };
      remoteParticipants.set(identity, participant as RemoteParticipant);

      mockRoom.emitEvent(RoomEvent.ParticipantConnected, participant);

      await expect(statisticsPromise).resolves.toMatchObject({
        remoteParticipantIdentities: [
          'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
          'J+T45tGruxc+HrUOqJJlyQSV33m728Cme4+vt8/SWrU',
        ],
      });
    });

    it('should disconnect on peer close', async () => {
      const connectionStates: string[] = [];
      const subscription = connection.observeStatistics().subscribe((stats) => {
        connectionStates.push(stats.connectionState);
      });

      mockRoom.setConnectionState(ConnectionState.Connected);
      await vi.waitFor(() => {
        expect(connectionStates).toContain('connected');
      });

      connection.close();

      await vi.waitFor(() => {
        expect(connectionStates).toContain('disconnected');
      });

      subscription.unsubscribe();
    });
  });
});
