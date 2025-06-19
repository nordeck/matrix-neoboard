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

import { WidgetApi } from '@matrix-widget-toolkit/api';
import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { waitFor } from '@testing-library/react';
import { ConnectionState } from 'livekit-client';
import { BehaviorSubject, Subject, firstValueFrom, toArray } from 'rxjs';
import {
  Mocked,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { mockDocumentVisibilityState } from '../../lib/testUtils/domTestUtils';
import { PeerConnectionStatistics } from './connection';
import { PeerConnection } from './connection/types';
import { MatrixRtcSessionManagerImpl, RTCFocus } from './discovery';
import AutoDiscovery from './discovery/autodiscovery';
import { MatrixRtcCommunicationChannel } from './matrixRtcCommunicationChannel';

const mockPeerConnection = {
  close: vi.fn(),
  destroy: vi.fn(),
  observeMessages: vi.fn().mockReturnValue(new Subject()),
  observeStatistics: vi.fn(),
  getRemoteSessionId: vi.fn(() => 'remote-session-id'),
  getConnectionId: vi.fn().mockReturnValue('connection-id'),
  observeConnectionState: vi.fn(),
  sendMessage: vi.fn(),
  updateStatistics: vi.fn(),
  handleDataReceived: vi.fn(),
} as unknown as Mocked<PeerConnection>;

vi.mock('./connection', () => {
  return {
    MatrixRtcPeerConnection: vi
      .fn()
      .mockImplementation(() => mockPeerConnection),
  };
});

let widgetApi: MockedWidgetApi;

beforeEach(() => {
  widgetApi = mockWidgetApi();
  // @ts-ignore forcefully set for tests
  widgetApi.widgetParameters.userId = '@user-id';
  // @ts-ignore forcefully set for tests
  widgetApi.widgetParameters.deviceId = 'DEVICEID';
});

afterEach(() => {
  widgetApi.stop();
  vi.useRealTimers();
});

describe('MatrixRtcCommunicationChannel', () => {
  let sessionManager: Mocked<MatrixRtcSessionManagerImpl>;
  let channel: MatrixRtcCommunicationChannel;
  let activeFocusSubject: Subject<RTCFocus>;
  let statisticsSubject: Subject<PeerConnectionStatistics>;
  let connectionStateSubject: Subject<ConnectionState>;
  let enableObserveVisibilityStateSubject: Subject<boolean>;
  let currentSessionId: string | undefined;

  const peerConnectionStatistics = {
    bytesReceived: 0,
    bytesSent: 0,
    packetsReceived: 0,
    packetsSent: 0,
    connectionState: 'new',
    iceConnectionState: 'new',
    iceGatheringState: 'new',
    signalingState: 'new',
    impolite: false,
    remoteSessionId: 'another-session-id',
    remoteUserId: '@another-user-id',
  };

  const mockActiveFocus: RTCFocus = {
    type: 'livekit',
    livekit_service_url: 'http://mock-livekit-server.example.com',
  };

  beforeEach(() => {
    mockDocumentVisibilityState('visible');

    activeFocusSubject = new Subject();
    statisticsSubject = new Subject();
    connectionStateSubject = new Subject<ConnectionState>();
    enableObserveVisibilityStateSubject = new BehaviorSubject(true);

    mockPeerConnection.observeStatistics.mockReturnValue(statisticsSubject);
    mockPeerConnection.observeConnectionState.mockReturnValue(
      connectionStateSubject,
    );
    mockPeerConnection.observeMessages.mockReturnValue(new Subject());

    createSessionManager();
    createChannel();
  });

  afterEach(() => {
    channel.destroy();
    vi.clearAllMocks();
  });

  it('should create peer connection and statistics on join', async () => {
    await waitForSessionExists();
    connectionStateSubject.next(ConnectionState.Connected);

    expect(sessionManager.join).toHaveBeenCalledTimes(1);
    expect(Object.values(channel.getStatistics().peerConnections).length).toBe(
      1,
    );
  });

  it('should disconnect while the browser is hidden', async () => {
    await waitForSessionExists();
    connectionStateSubject.next(ConnectionState.Connected);

    expect(sessionManager.join).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    sessionManager.leave.mockClear();

    // Hide the tab
    mockDocumentVisibilityState('hidden');

    vi.advanceTimersByTime(250);

    expect(sessionManager.leave).toHaveBeenCalledTimes(1);

    await vi.waitFor(() => {
      expect(sessionManager.getSessionId()).toBeUndefined();
    });
  });

  it('should skip disconnect while the browser is hidden if disabled', async () => {
    await waitForSessionExists();
    connectionStateSubject.next(ConnectionState.Connected);

    vi.useFakeTimers();
    sessionManager.leave.mockClear();

    enableObserveVisibilityStateSubject.next(false);

    // Hide the tab
    mockDocumentVisibilityState('hidden');

    vi.advanceTimersByTime(1250);
    expect(sessionManager.leave).not.toHaveBeenCalled();
  });

  it('should handle messages from peer connections', async () => {
    await waitForSessionExists();
    connectionStateSubject.next(ConnectionState.Connected);

    const messagesPromise = firstValueFrom(channel.observeMessages());

    // @ts-ignore
    channel.messagesSubject.next({
      type: 'example_type',
      content: { key: 'value' },
      senderSessionId: 'another-session-id',
      senderUserId: '@another-user-id',
    });

    await expect(messagesPromise).resolves.toEqual({
      type: 'example_type',
      content: { key: 'value' },
      senderSessionId: 'another-session-id',
      senderUserId: '@another-user-id',
    });
  });

  it('should send messages to peer connections', async () => {
    await waitForSessionExists();
    connectionStateSubject.next(ConnectionState.Connected);

    channel.broadcastMessage('example_type', { key: 'value' });

    expect(mockPeerConnection.sendMessage).toHaveBeenCalledWith(
      'example_type',
      {
        key: 'value',
      },
    );
  });

  it('should leave when disconnected', async () => {
    await waitForSessionExists();
    connectionStateSubject.next(ConnectionState.Connected);

    expect(sessionManager.join).toHaveBeenCalledTimes(1);

    connectionStateSubject.next(ConnectionState.Disconnected);

    await waitFor(() => {
      expect(sessionManager.leave).toHaveBeenCalled();
    });
  });

  it('should leave after destroying', async () => {
    await waitForSessionExists();
    connectionStateSubject.next(ConnectionState.Connected);

    const messagesPromise = firstValueFrom(
      channel.observeMessages().pipe(toArray()),
    );
    const statisticsPromise = firstValueFrom(
      channel.observeStatistics().pipe(toArray()),
    );

    channel.destroy();

    await expect(messagesPromise).resolves.toEqual([]);
    await expect(statisticsPromise).resolves.toEqual([]);
    await waitFor(() => {
      expect(sessionManager.leave).toHaveBeenCalled();
    });
  });

  async function waitForSessionExists() {
    await waitFor(() => {
      statisticsSubject.next(peerConnectionStatistics);
      expect(
        Object.values(channel.getStatistics().peerConnections).length,
      ).toBe(1);
    });
  }

  function createSessionManager() {
    sessionManager = vi.mocked(
      Object.assign(new MatrixRtcSessionManagerImpl(widgetApi as WidgetApi), {
        getSessionId: vi.fn(() => currentSessionId),
        getActiveFocus: vi.fn().mockReturnValue(mockActiveFocus),
        observeActiveFocus: vi.fn().mockReturnValue(activeFocusSubject),
        join: vi.fn().mockImplementation(async () => {
          const sessionId = 'session-id';
          currentSessionId = sessionId;
          return { sessionId };
        }),
        leave: vi.fn().mockImplementation(async () => {
          currentSessionId = undefined;
        }),
        destroy: vi.fn(),
      }),
    );
  }

  function createChannel() {
    channel = new MatrixRtcCommunicationChannel(
      widgetApi,
      sessionManager as MatrixRtcSessionManagerImpl,
      'whiteboard-id',
      enableObserveVisibilityStateSubject,
      250,
    );

    const mockGetSFUConfigWithOpenID = vi.fn().mockResolvedValue({
      url: 'wss://mock-livekit-server.example.com',
      jwt: 'mock-jwt-token',
    });
    vi.spyOn(AutoDiscovery, 'getSFUConfigWithOpenID').mockImplementation(
      mockGetSFUConfigWithOpenID,
    );
  }
});
