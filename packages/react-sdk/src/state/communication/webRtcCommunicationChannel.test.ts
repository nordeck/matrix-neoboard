/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { waitFor } from '@testing-library/react';
import {
  BehaviorSubject,
  NEVER,
  Subject,
  delay,
  firstValueFrom,
  of,
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
import {
  Message,
  PeerConnection,
  PeerConnectionStatistics,
  WebRtcPeerConnection,
} from './connection';
import { Session, SessionManager } from './discovery';
import { SessionState } from './discovery/sessionManagerImpl';
import { SignalingChannel } from './signaling';
import { WebRtcCommunicationChannel } from './webRtcCommunicationChannel';

vi.mock('./connection', async () => ({
  ...(await vi.importActual<typeof import('./connection')>('./connection')),
  WebRtcPeerConnection: vi.fn(),
}));

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WebRtcCommunicationChannel', () => {
  const anotherSession = {
    sessionId: 'another-session-id',
    userId: '@another-user-id',
  };
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
  let sessionManager: Mocked<SessionManager>;
  let signalingChannel: SignalingChannel;
  let peerConnection: Mocked<PeerConnection>;
  let channel: WebRtcCommunicationChannel;
  let sessionSubject: Subject<SessionState>;
  let joinedSubject: Subject<Session>;
  let leftSubject: Subject<Session>;
  let statisticsSubject: Subject<PeerConnectionStatistics>;
  let messageSubject: Subject<Message>;
  let enableObserveVisibilityStateSubject: Subject<boolean>;

  beforeEach(() => {
    mockDocumentVisibilityState('visible');

    let currentSessionId: string | undefined;

    signalingChannel = {
      destroy: vi.fn(),
      observeSignaling: vi.fn().mockReturnValue(NEVER),
      sendCandidates: vi.fn().mockImplementation(async () => {}),
      sendDescription: vi.fn().mockImplementation(async () => {}),
    };

    sessionSubject = new Subject();
    joinedSubject = new Subject();
    leftSubject = new Subject();
    sessionManager = {
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
    };

    statisticsSubject = new Subject();
    messageSubject = new Subject();
    enableObserveVisibilityStateSubject = new BehaviorSubject(true);
    peerConnection = {
      getRemoteSessionId: vi.fn().mockReturnValue('another-session-id'),
      getConnectionId: vi.fn().mockReturnValue('connection-id'),
      close: vi.fn(() => {
        statisticsSubject.complete();
        messageSubject.complete();
      }),
      sendMessage: vi.fn(),
      observeMessages: vi.fn().mockReturnValue(messageSubject),
      observeStatistics: vi.fn().mockReturnValue(statisticsSubject),
      observeConnectionState: vi.fn(),
    };
    vi.mocked(WebRtcPeerConnection).mockReturnValue(
      peerConnection as unknown as WebRtcPeerConnection,
    );
  });

  afterEach(() => {
    channel.destroy();
    vi.resetAllMocks();
  });

  describe('with non-deferred TURN config', () => {
    beforeEach(() => {
      createChannel();
    });

    it('should close peer connections for left sessions', async () => {
      joinedSubject.next(anotherSession);
      await waitForSessionExists();

      leftSubject.next(anotherSession);

      expect(peerConnection.close).toHaveBeenCalled();
      expect(channel.getStatistics()).toEqual({
        localSessionId: 'session-id',
        peerConnections: {},
        sessions: [],
      });
    });

    it('should disconnect while the browser is hidden', async () => {
      joinedSubject.next(anotherSession);
      await waitForSessionExists();

      vi.useFakeTimers();

      // Hide the tab
      mockDocumentVisibilityState('hidden');

      vi.advanceTimersByTime(250);
      expect(sessionManager.leave).toHaveBeenCalled();
      expect(peerConnection.close).toHaveBeenCalled();

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
      expect(peerConnection.close).not.toHaveBeenCalled();
    });

    it('should forward statistics from peer connections', async () => {
      joinedSubject.next(anotherSession);
      await waitForSessionExists();

      const statisticsPromise = firstValueFrom(channel.observeStatistics());

      statisticsSubject.next(peerConnectionStatistics);

      expect(channel.getStatistics()).toEqual({
        localSessionId: 'session-id',
        peerConnections: {
          'connection-id': peerConnectionStatistics,
        },
        sessions: [],
      });
      await expect(statisticsPromise).resolves.toEqual({
        localSessionId: 'session-id',
        peerConnections: {
          'connection-id': peerConnectionStatistics,
        },
        sessions: [],
      });
    });

    it('should messages from peer connections', async () => {
      joinedSubject.next(anotherSession);
      await waitForSessionExists();

      const messagesPromise = firstValueFrom(channel.observeMessages());

      messageSubject.next({
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

    it('should send messages to all peer connections', async () => {
      joinedSubject.next(anotherSession);
      await waitForSessionExists();

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
      await waitFor(() => {
        expect(peerConnection.close).toHaveBeenCalled();
      });
    });
  });

  describe('with deferred TURN config', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      createChannel(true);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should add peer connections for joined sessions', async () => {
      expect(sessionManager.join).toHaveBeenCalledWith('whiteboard-id');
      expect(channel.getStatistics()).toMatchObject({
        localSessionId: 'session-id',
      });

      joinedSubject.next(anotherSession);
      await vi.runAllTimersAsync();

      expect(WebRtcPeerConnection).toHaveBeenCalledWith(
        signalingChannel,
        anotherSession,
        'session-id',
        {
          turnServer: {
            credential: 'example-turn-credentials',
            urls: ['turn:turn.example.com'],
            username: 'example-turn-username',
          },
        },
      );
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

  function createChannel(deferredTurnConfig = false) {
    if (deferredTurnConfig) {
      // Simulate deferred TURN server configuration
      widgetApi.observeTurnServers.mockImplementation(() => {
        const exampleTurn = of({
          urls: ['turn:turn.example.com'],
          username: 'example-turn-username',
          credential: 'example-turn-credentials',
        });
        return exampleTurn.pipe(delay(500));
      });
    }

    channel = new WebRtcCommunicationChannel(
      widgetApi,
      sessionManager,
      signalingChannel,
      'whiteboard-id',
      enableObserveVisibilityStateSubject,
      250,
    );
  }
});
