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
import { PeerConnection, PeerConnectionStatistics } from './connection';
import { MatrixRtcSessionManagerImpl, Session } from './discovery';
import { SessionState } from './discovery/sessionManagerImpl';
import { MatrixRtcCommunicationChannel } from './matrixRtcCommunicationChannel';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('MatrixRtcCommunicationChannel', () => {
  const anotherSession = {
    sessionId: 'another-session-id',
    userId: '@another-user-id',
  };
  const ownConnectionStatistics = {
    bytesReceived: 0,
    bytesSent: 0,
    packetsReceived: 0,
    packetsSent: 0,
    connectionState: expect.any(String),
    dataChannelState: 'undefined',
    iceConnectionState: 'undefined',
    iceGatheringState: 'undefined',
    signalingState: 'undefined',
    impolite: false,
    remoteSessionId: 'session-id',
    remoteUserId: '@user-id',
  };

  let sessionManager: Mocked<MatrixRtcSessionManagerImpl>;
  let peerConnection: Mocked<PeerConnection>;
  let channel: MatrixRtcCommunicationChannel;
  let sessionSubject: Subject<SessionState>;
  let joinedSubject: Subject<Session>;
  let leftSubject: Subject<Session>;
  let statisticsSubject: Subject<PeerConnectionStatistics>;
  let enableObserveVisibilityStateSubject: Subject<boolean>;

  beforeEach(() => {
    mockDocumentVisibilityState('visible');

    let currentSessionId: string | undefined;

    sessionSubject = new Subject();
    joinedSubject = new Subject();
    leftSubject = new Subject();
    sessionManager = vi.mocked(
      Object.assign(new MatrixRtcSessionManagerImpl({} as WidgetApi), {
        getSessionId: vi.fn(() => currentSessionId),
        getSessions: vi.fn().mockReturnValue([]),
        observeSession: vi.fn().mockReturnValue(sessionSubject),
        observeSessionJoined: vi.fn().mockReturnValue(joinedSubject),
        observeSessionLeft: vi.fn().mockReturnValue(leftSubject),
        join: vi.fn().mockImplementation(async () => {
          const sessionId = 'session-id';
          currentSessionId = sessionId;
          return { sessionId };
        }),
        leave: vi.fn().mockImplementation(async () => {
          leftSubject.next(anotherSession);
          currentSessionId = undefined;
        }),
        destroy: vi.fn(),
        updateSessionSFU: vi.fn(),
      }),
    );

    statisticsSubject = new Subject();
    enableObserveVisibilityStateSubject = new BehaviorSubject(true);

    peerConnection = {
      sendMessage: vi.fn(),
      close: vi.fn(),
      observeMessages: vi.fn().mockReturnValue(new Subject()),
      observeStatistics: vi.fn().mockReturnValue(statisticsSubject),
      getRemoteSessionId: vi.fn().mockReturnValue('another-session-id'),
      getConnectionId: vi.fn().mockReturnValue('connection-id'),
    } as unknown as Mocked<PeerConnection>;

    createChannel();
  });

  afterEach(() => {
    channel.destroy();
    vi.resetAllMocks();
  });

  it('should disconnect while the browser is hidden', async () => {
    joinedSubject.next(anotherSession);
    await waitForSessionExists();

    vi.useFakeTimers();

    // Hide the tab
    mockDocumentVisibilityState('hidden');

    vi.advanceTimersByTime(250);
    expect(sessionManager.leave).toHaveBeenCalled();

    await vi.waitFor(() => {
      expect(sessionManager.getSessionId()).toBeUndefined();
    });

    // Make the tab visible again
    mockDocumentVisibilityState('visible');

    expect(sessionManager.join).toHaveBeenCalledTimes(2);
    expect(sessionManager.join).toHaveBeenCalledWith('whiteboard-id');
  });

  it('should skip disconnect while the browser is hidden if disabled', async () => {
    vi.useFakeTimers();
    joinedSubject.next(anotherSession);

    enableObserveVisibilityStateSubject.next(false);

    // Hide the tab
    mockDocumentVisibilityState('hidden');

    vi.advanceTimersByTime(1250);
    expect(sessionManager.leave).not.toHaveBeenCalled();
  });

  it('should handle messages from peer connections', async () => {
    joinedSubject.next(anotherSession);
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
    joinedSubject.next(anotherSession);
    await waitForSessionExists();

    // @ts-ignore
    channel.peerConnections = [peerConnection];
    channel.broadcastMessage('example_type', { key: 'value' });

    expect(peerConnection.sendMessage).toHaveBeenCalledWith('example_type', {
      key: 'value',
    });
  });

  it('should leave after destroying', async () => {
    joinedSubject.next(anotherSession);
    await waitForSessionExists();

    const messagesPromise = firstValueFrom(
      channel.observeMessages().pipe(toArray()),
    );
    const statisticsPromise = firstValueFrom(
      channel.observeMessages().pipe(toArray()),
    );

    channel.destroy();

    await expect(messagesPromise).resolves.toEqual([]);
    await expect(statisticsPromise).resolves.toEqual([]);
    await waitFor(() => {
      expect(sessionManager.leave).toHaveBeenCalled();
    });
  });

  it('should add peer connection when joining session', async () => {
    expect(sessionManager.join).toHaveBeenCalledWith('whiteboard-id');
    await waitFor(() => {
      statisticsSubject.next(ownConnectionStatistics);
      expect(
        Object.values(channel.getStatistics().peerConnections).length,
      ).toBe(1);
    });

    expect(channel.getStatistics()).toMatchObject({
      localSessionId: 'session-id',
    });
  });

  async function waitForSessionExists() {
    await waitFor(() => {
      statisticsSubject.next(ownConnectionStatistics);
      expect(
        Object.values(channel.getStatistics().peerConnections).length,
      ).toBe(1);
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

    const mockInitLiveKitServer = vi.fn().mockImplementation(function (
      this: unknown,
    ) {
      Object.defineProperty(this, 'sfuConfig', {
        value: {
          url: 'wss://mock-livekit-server.example.com',
          jwt: 'mock-jwt-token',
        },
        writable: true,
      });
      return Promise.resolve();
    });

    // @ts-ignore - Overriding private method
    channel.initLiveKitServer = mockInitLiveKitServer;
  }
});
