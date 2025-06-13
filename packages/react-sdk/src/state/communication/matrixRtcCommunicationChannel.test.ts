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
import {
  BehaviorSubject,
  ReplaySubject,
  Subject,
  firstValueFrom,
  toArray,
} from 'rxjs';
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
import { connectionStateHandler } from './connectionStateHandler';
import { LivekitFocus, MatrixRtcSessionManagerImpl } from './discovery';
import AutoDiscovery from './discovery/autodiscovery';
import { MatrixRtcCommunicationChannel } from './matrixRtcCommunicationChannel';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
  // @ts-ignore forcefully set for tests
  widgetApi.widgetParameters.userId = '@user-id';
  // @ts-ignore forcefully set for tests
  widgetApi.widgetParameters.deviceId = 'DEVICEID';
});

afterEach(() => {
  vi.useRealTimers();
});

describe('MatrixRtcCommunicationChannel', () => {
  let sessionManager: Mocked<MatrixRtcSessionManagerImpl>;
  let peerConnection: Mocked<PeerConnection>;
  let channel: MatrixRtcCommunicationChannel;
  let activeFocusSubject: ReplaySubject<LivekitFocus>;
  let statisticsSubject: Subject<PeerConnectionStatistics>;
  let connectionStateSubject: Subject<ConnectionState>;
  let enableObserveVisibilityStateSubject: Subject<boolean>;
  let currentSessionId: string | undefined;

  const mockActiveFocus: LivekitFocus = {
    type: 'livekit',
    livekit_service_url: 'http://mock-livekit-server.example.com',
    livekit_alias: 'mock-livekit-alias',
  };

  beforeEach(() => {
    mockDocumentVisibilityState('visible');

    activeFocusSubject = new ReplaySubject(1);
    statisticsSubject = new Subject();
    connectionStateSubject = new Subject<ConnectionState>();
    enableObserveVisibilityStateSubject = new BehaviorSubject(true);

    createSessionManager();
    createPeerConnection();
    createChannel();
  });

  afterEach(() => {
    channel.destroy();
    vi.resetAllMocks();
  });

  it('should create peer connection and statistics on join', async () => {
    activeFocusSubject.next(mockActiveFocus);
    connectionStateSubject.next(ConnectionState.Connected);

    expect(sessionManager.join).toHaveBeenCalledTimes(1);

    expect(channel.getStatistics().localSessionId).toBe('session-id');
    expect(Object.values(channel.getStatistics().peerConnections).length).toBe(
      1,
    );
  });

  it('should disconnect while the browser is hidden', async () => {
    activeFocusSubject.next(mockActiveFocus);
    connectionStateSubject.next(ConnectionState.Connected);

    await waitForSessionExists();

    vi.useFakeTimers();

    // Hide the tab
    mockDocumentVisibilityState('hidden');

    vi.advanceTimersByTime(250);
    expect(sessionManager.leave).toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(sessionManager.getSessionId()).toBeUndefined();
    });

    sessionManager.join.mockClear();

    // Make the tab visible again
    mockDocumentVisibilityState('visible');

    connectionStateSubject.next(ConnectionState.Connected);

    expect(sessionManager.join).toHaveBeenCalledTimes(1);
  });

  it('should skip disconnect while the browser is hidden if disabled', async () => {
    activeFocusSubject.next(mockActiveFocus);
    connectionStateSubject.next(ConnectionState.Connected);

    await waitForSessionExists();

    vi.useFakeTimers();

    enableObserveVisibilityStateSubject.next(false);

    // Hide the tab
    mockDocumentVisibilityState('hidden');

    vi.advanceTimersByTime(1250);
    expect(sessionManager.leave).not.toHaveBeenCalled();
  });

  it('should handle messages from peer connections', async () => {
    activeFocusSubject.next(mockActiveFocus);
    connectionStateSubject.next(ConnectionState.Connected);

    await waitForSessionExists();

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
    activeFocusSubject.next(mockActiveFocus);
    connectionStateSubject.next(ConnectionState.Connected);

    await waitForSessionExists();

    // @ts-ignore
    channel.peerConnections = [peerConnection];
    channel.broadcastMessage('example_type', { key: 'value' });

    expect(peerConnection.sendMessage).toHaveBeenCalledWith('example_type', {
      key: 'value',
    });
  });

  it('should leave when disconnected', async () => {
    activeFocusSubject.next(mockActiveFocus);
    connectionStateSubject.next(ConnectionState.Connected);

    await waitForSessionExists();

    expect(sessionManager.join).toHaveBeenCalledTimes(1);

    connectionStateSubject.next(ConnectionState.Disconnected);

    await waitFor(() => {
      expect(sessionManager.leave).toHaveBeenCalled();
    });
  });

  it('should leave after destroying', async () => {
    activeFocusSubject.next(mockActiveFocus);
    connectionStateSubject.next(ConnectionState.Connected);

    await waitForSessionExists();

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
      expect(
        Object.values(channel.getStatistics().peerConnections).length,
      ).toBe(1);
    });
  }

  function createSessionManager() {
    sessionManager = vi.mocked(
      Object.assign(new MatrixRtcSessionManagerImpl(widgetApi as WidgetApi), {
        getSessionId: vi.fn(() => currentSessionId),
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

  function createPeerConnection() {
    peerConnection = {
      sendMessage: vi.fn(),
      close: vi.fn(),
      observeMessages: vi.fn().mockReturnValue(new Subject()),
      observeStatistics: vi.fn().mockReturnValue(statisticsSubject),
      getConnectionId: vi.fn().mockReturnValue('connection-id'),
      observeConnectionState: vi.fn().mockReturnValue(connectionStateSubject),
    } as unknown as Mocked<PeerConnection>;

    peerConnection.observeConnectionState().subscribe(async (state) => {
      await connectionStateHandler(
        state,
        // @ts-ignore
        channel.connect.bind(channel),
        // @ts-ignore
        channel.disconnect.bind(channel),
      );
    });
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

    const mockinitFocusBackend = vi.fn().mockImplementation(function (
      this: MatrixRtcCommunicationChannel,
    ) {
      this.getStatistics = vi.fn().mockReturnValue({
        localSessionId: 'session-id',
        peerConnections: [peerConnection],
      });

      return Promise.resolve();
    });

    // @ts-ignore - Overriding private method
    channel.initFocusBackend = mockinitFocusBackend;
  }
});
