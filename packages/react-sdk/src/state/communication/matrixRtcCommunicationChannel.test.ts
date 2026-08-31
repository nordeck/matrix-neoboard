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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import clone from 'lodash/clone';
import { BehaviorSubject, Subject, firstValueFrom, take, toArray } from 'rxjs';
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
  MatrixRtcPeerConnection,
  Message,
  PeerConnection,
  PeerConnectionStatistics,
} from './connection';
import { MatrixRtcSession, Session, SessionManager } from './discovery';
import AutoDiscovery, { SFUConfig } from './discovery/autodiscovery';
import { MatrixRtcCommunicationChannel } from './matrixRtcCommunicationChannel';

vi.mock('./connection', () => {
  return {
    MatrixRtcPeerConnection: vi.fn(),
  };
});

let widgetApi: MockedWidgetApi;

beforeEach(() => {
  widgetApi = mockWidgetApi();
  // @ts-ignore forcefully set for tests
  widgetApi.widgetParameters.userId = '@user-id:example.com';
  // @ts-ignore forcefully set for tests
  widgetApi.widgetParameters.deviceId = 'DEVICEID';
});

afterEach(() => {
  widgetApi.stop();
  vi.useRealTimers();
});

describe('MatrixRtcCommunicationChannel', () => {
  const ownSession: MatrixRtcSession = {
    sessionId: 'session-id',
    userId: '@user-id:example.com',
    memberId: 'member-id',
    livekitTransport: {
      livekitServiceUrl: 'https://livekit-jwt.example.com',
    },
  };
  const peerConnectionStatistics: Partial<PeerConnectionStatistics> = {
    localParticipantIdentity: 'session-id',
    remoteParticipantIdentities: [],
    bytesReceived: 0,
    bytesSent: 0,
    packetsReceived: 0,
    packetsSent: 0,
    connectionState: 'new',
  };

  let sessionManager: Mocked<SessionManager<MatrixRtcSession>>;
  let peerConnection: Mocked<PeerConnection>;
  let peerConnectionAnother: Mocked<PeerConnection>;
  let channel: MatrixRtcCommunicationChannel;
  let joinedSubject: Subject<MatrixRtcSession>;
  let leftSubject: Subject<Session>;
  let statisticsSubject: Subject<Partial<PeerConnectionStatistics>>;
  let statisticsAnotherSubject: Subject<Partial<PeerConnectionStatistics>>;
  let messageSubject: Subject<Message>;
  let messageSubjectAnother: Subject<Message>;
  let enableObserveVisibilityStateSubject: Subject<boolean>;

  beforeEach(() => {
    mockDocumentVisibilityState('visible');

    statisticsSubject = new Subject();
    statisticsAnotherSubject = new Subject();
    messageSubject = new Subject();
    messageSubjectAnother = new Subject();
    enableObserveVisibilityStateSubject = new BehaviorSubject(true);

    joinedSubject = new Subject();
    leftSubject = new Subject();

    let currentSessionId: string | undefined;
    sessionManager = {
      getSessionId: vi.fn(() => currentSessionId),
      getSessions: vi.fn().mockReturnValue([]),
      observeSessionJoined: vi.fn().mockReturnValue(joinedSubject),
      observeSessionLeft: vi.fn().mockReturnValue(leftSubject),
      join: vi.fn().mockImplementation(async () => {
        const sessionId = 'session-id';
        currentSessionId = sessionId;
        const session: MatrixRtcSession = {
          userId: '@user-id:example.com',
          sessionId,
          memberId: 'member-id',
          livekitTransport: {
            livekitServiceUrl: 'https://livekit-jwt.example.com',
          },
        };
        return session;
      }),
      leave: vi.fn().mockImplementation(async () => {
        currentSessionId = undefined;
      }),
      destroy: vi.fn(),
    };
    let peerConnectionCount = 0;
    vi.mocked(MatrixRtcPeerConnection).mockImplementation(
      (livekitServiceUrl) => {
        const newPeerConnection = mockPeerConnection({
          connectionId: livekitServiceUrl,
          messageSubject:
            peerConnectionCount === 0 ? messageSubject : messageSubjectAnother,
          statisticsSubject:
            peerConnectionCount === 0
              ? statisticsSubject
              : statisticsAnotherSubject,
        });
        if (peerConnectionCount === 0) {
          peerConnection = newPeerConnection;
        } else {
          peerConnectionAnother = newPeerConnection;
        }
        peerConnectionCount++;
        return newPeerConnection as unknown as MatrixRtcPeerConnection;
      },
    );
    vi.spyOn(AutoDiscovery, 'getSFUConfigWithOpenID').mockImplementation(
      (_widgetApi, activeFocus) => {
        let sfuConfig: SFUConfig;
        if (
          activeFocus.livekit_service_url === 'https://livekit-jwt.example.com'
        ) {
          sfuConfig = {
            url: 'wss://mock-livekit-server.example.com',
            jwt: 'mock-jwt-token',
          };
        } else {
          sfuConfig = {
            url: 'wss://mock-livekit-server.example-1.com',
            jwt: 'mock-jwt-token-another',
          };
        }

        return Promise.resolve(sfuConfig);
      },
    );

    channel = new MatrixRtcCommunicationChannel(
      widgetApi,
      sessionManager,
      'whiteboard-id',
      enableObserveVisibilityStateSubject,
      250,
    );
  });

  afterEach(() => {
    channel.destroy();
    vi.clearAllMocks();
  });

  it('should join', async () => {
    joinedSubject.next(ownSession);
    await waitForSessionExists(statisticsSubject);
    expect(sessionManager.join).toHaveBeenCalledWith('whiteboard-id');
    expect(AutoDiscovery.getSFUConfigWithOpenID).toHaveBeenCalledWith(
      {},
      {
        type: 'livekit',
        livekit_service_url: 'https://livekit-jwt.example.com',
        livekit_alias: '!room-id:example.com',
      },
      'net.nordeck.whiteboard#whiteboard-id',
      '@user-id:example.com',
      'DEVICEID',
      'member-id',
    );
    expect(AutoDiscovery.getSFUConfigWithOpenID).toHaveBeenCalledTimes(1);
    expect(sessionManager.getSessionId()).toBe('session-id');
    expect(channel.getStatistics()).toEqual({
      localSession: {
        sessionId: 'session-id',
        memberId: 'member-id',
        livekitServiceUrl: 'https://livekit-jwt.example.com',
      },
      peerConnections: {
        'https://livekit-jwt.example.com': peerConnectionStatistics,
      },
      sessions: {
        'session-id': {
          userId: '@user-id:example.com',
        },
      },
    });
  });

  it('should re-join on leave', async () => {
    joinedSubject.next(ownSession);
    await waitForSessionExists(statisticsSubject);
    expect(sessionManager.join).toHaveBeenCalledWith('whiteboard-id');
    expect(channel.getStatistics()).toEqual({
      localSession: {
        sessionId: 'session-id',
        memberId: 'member-id',
        livekitServiceUrl: 'https://livekit-jwt.example.com',
      },
      peerConnections: {
        'https://livekit-jwt.example.com': peerConnectionStatistics,
      },
      sessions: {
        'session-id': {
          userId: '@user-id:example.com',
        },
      },
    });

    sessionManager.join.mockResolvedValue({
      userId: '@user-id:example.com',
      sessionId: 'session-id-1',
      memberId: '$member-id-1',
      livekitTransport: {
        livekitServiceUrl: 'https://livekit-jwt.example.com',
      },
    });

    const userLeaveSession: MatrixRtcSession = {
      sessionId: 'session-id',
      userId: '@user-id:example.com',
      memberId: 'member-id',
      livekitTransport: {
        livekitServiceUrl: 'https://livekit-jwt.example.com',
      },
    };
    leftSubject.next(userLeaveSession);

    joinedSubject.next({
      sessionId: 'session-id-1',
      userId: '@user-id:example.com',
      memberId: '$member-id-1',
      livekitTransport: {
        livekitServiceUrl: 'https://livekit-jwt.example.com',
      },
    });

    expect(sessionManager.join).toHaveBeenCalledTimes(2);

    // check that existing peer connection is closed
    await vi.waitFor(() => {
      expect(channel.getStatistics()).toEqual({
        localSession: {
          sessionId: 'session-id-1',
          memberId: '$member-id-1',
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
        peerConnections: {},
        sessions: {
          'session-id-1': {
            userId: '@user-id:example.com',
          },
        },
      });
    });

    // check that a new peer connection is created
    await waitForSessionExists(statisticsAnotherSubject);
    await vi.waitFor(() => {
      expect(channel.getStatistics()).toEqual({
        localSession: {
          sessionId: 'session-id-1',
          memberId: '$member-id-1',
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
        peerConnections: {
          'https://livekit-jwt.example.com': peerConnectionStatistics,
        },
        sessions: {
          'session-id-1': {
            userId: '@user-id:example.com',
          },
        },
      });
    });
  });

  it('should join and another user with another transport joins', async () => {
    joinedSubject.next(ownSession);
    await waitForSessionExists(statisticsSubject);

    const anotherSession: MatrixRtcSession = {
      sessionId: 'another-session-id',
      userId: '@another-user-id:example-1.com',
      memberId: '$member-id-0',
      livekitTransport: {
        livekitServiceUrl: 'https://livekit-jwt.example-1.com',
      },
    };
    joinedSubject.next(anotherSession);

    await vi.waitFor(() => {
      statisticsAnotherSubject.next({
        ...peerConnectionStatistics,
        remoteParticipantIdentities: ['another-session-id'],
      });
      expect(
        Object.values(channel.getStatistics().peerConnections).length,
      ).toBe(2);
    });

    expect(AutoDiscovery.getSFUConfigWithOpenID).toHaveBeenNthCalledWith(
      2,
      {},
      {
        type: 'livekit',
        livekit_service_url: 'https://livekit-jwt.example-1.com',
        livekit_alias: '!room-id:example.com',
      },
      'net.nordeck.whiteboard#whiteboard-id',
      '@user-id:example.com',
      'DEVICEID',
      'member-id',
    );
    expect(AutoDiscovery.getSFUConfigWithOpenID).toHaveBeenCalledTimes(2);
    expect(channel.getStatistics()).toEqual({
      localSession: {
        sessionId: 'session-id',
        memberId: 'member-id',
        livekitServiceUrl: 'https://livekit-jwt.example.com',
      },
      peerConnections: {
        'https://livekit-jwt.example.com': peerConnectionStatistics,
        'https://livekit-jwt.example-1.com': {
          ...peerConnectionStatistics,
          remoteParticipantIdentities: ['another-session-id'],
        },
      },
      sessions: {
        'session-id': {
          userId: '@user-id:example.com',
        },
        'another-session-id': {
          userId: '@another-user-id:example-1.com',
        },
      },
    });
  });

  it('should join and another user with same transport joins', async () => {
    joinedSubject.next(ownSession);
    await waitForSessionExists(statisticsSubject);

    const anotherSession: MatrixRtcSession = {
      sessionId: 'another-session-id',
      userId: '@another-user-id:example.com',
      memberId: '$member-id-0',
      livekitTransport: {
        livekitServiceUrl: 'https://livekit-jwt.example.com',
      },
    };
    joinedSubject.next(anotherSession);

    await vi.waitFor(() => {
      statisticsSubject.next({
        ...peerConnectionStatistics,
        remoteParticipantIdentities: ['another-session-id'],
      });
      expect(channel.getStatistics()).toEqual({
        localSession: {
          sessionId: 'session-id',
          memberId: 'member-id',
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
        peerConnections: {
          'https://livekit-jwt.example.com': {
            ...peerConnectionStatistics,
            remoteParticipantIdentities: ['another-session-id'],
          },
        },
        sessions: {
          'session-id': {
            userId: '@user-id:example.com',
          },
          'another-session-id': {
            userId: '@another-user-id:example.com',
          },
        },
      });
    });

    expect(AutoDiscovery.getSFUConfigWithOpenID).toHaveBeenCalledTimes(1);
  });

  it('should disconnect while the browser is hidden', async () => {
    joinedSubject.next(ownSession);
    await waitForSessionExists(statisticsSubject);

    expect(sessionManager.join).toHaveBeenCalledTimes(1);

    expect(channel.getStatistics()).toEqual({
      localSession: {
        sessionId: 'session-id',
        memberId: 'member-id',
        livekitServiceUrl: 'https://livekit-jwt.example.com',
      },
      peerConnections: {
        'https://livekit-jwt.example.com': peerConnectionStatistics,
      },
      sessions: {
        'session-id': {
          userId: '@user-id:example.com',
        },
      },
    });

    vi.useFakeTimers();

    // Hide the tab
    mockDocumentVisibilityState('hidden');

    vi.advanceTimersByTime(250);

    expect(sessionManager.leave).toHaveBeenCalled();
    await vi.waitFor(() => {
      expect(peerConnection.close).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      expect(sessionManager.getSessionId()).toBeUndefined();
    });

    // check that existing peer connection is closed
    expect(channel.getStatistics()).toEqual({
      peerConnections: {},
      sessions: {},
    });

    sessionManager.join.mockResolvedValue({
      userId: '@user-id:example.com',
      sessionId: 'session-id-1',
      memberId: '$member-id-1',
      livekitTransport: {
        livekitServiceUrl: 'https://livekit-jwt.example.com',
      },
    });

    // Show the tab
    mockDocumentVisibilityState('visible');

    expect(sessionManager.join).toHaveBeenCalledTimes(2);

    // check that a new peer connection is created
    await waitForSessionExists(statisticsAnotherSubject);
    await vi.waitFor(() => {
      expect(channel.getStatistics()).toEqual({
        localSession: {
          sessionId: 'session-id-1',
          memberId: '$member-id-1',
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
        peerConnections: {
          'https://livekit-jwt.example.com': peerConnectionStatistics,
        },
        sessions: {},
      });
    });
  });

  it('should not attempt to connect when destroyed but browser becomes visible', async () => {
    joinedSubject.next(ownSession);
    await waitForSessionExists(statisticsSubject);

    expect(sessionManager.join).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();

    // Hide the tab
    mockDocumentVisibilityState('hidden');

    vi.advanceTimersByTime(250);

    expect(sessionManager.leave).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => {
      expect(peerConnection.close).toHaveBeenCalled();
    });

    await vi.waitFor(() => {
      expect(sessionManager.getSessionId()).toBeUndefined();
    });

    channel.destroy();

    // Show the tab
    mockDocumentVisibilityState('visible');

    expect(sessionManager.join).toHaveBeenCalledTimes(1);
  });

  it('should skip disconnect while the browser is hidden if disabled', async () => {
    joinedSubject.next(ownSession);
    vi.useFakeTimers();
    sessionManager.leave.mockClear();

    enableObserveVisibilityStateSubject.next(false);

    // Hide the tab
    mockDocumentVisibilityState('hidden');

    vi.advanceTimersByTime(1250);
    expect(sessionManager.leave).not.toHaveBeenCalled();
    expect(peerConnection.close).not.toHaveBeenCalled();
  });

  it('should receive messages from any peer connection', async () => {
    joinedSubject.next(ownSession);
    await waitForSessionExists(statisticsSubject);

    const anotherSession: MatrixRtcSession = {
      sessionId: 'another-session-id',
      userId: '@another-user-id:example-1.com',
      memberId: '$member-id-0',
      livekitTransport: {
        livekitServiceUrl: 'https://livekit-jwt.example-1.com',
      },
    };
    joinedSubject.next(anotherSession);

    await vi.waitFor(() => {
      statisticsAnotherSubject.next({
        ...peerConnectionStatistics,
        remoteParticipantIdentities: ['another-session-id'],
      });
      expect(
        Object.values(channel.getStatistics().peerConnections).length,
      ).toBe(2);
    });

    const messagesPromise = firstValueFrom(
      channel.observeMessages().pipe(take(2), toArray()),
    );

    messageSubject.next({
      type: 'example_type',
      content: { key: 'value' },
      senderSessionId: 'session-id',
      senderUserId: '@user-id:example.com',
    });
    messageSubjectAnother.next({
      type: 'example_type',
      content: { key: 'another-value' },
      senderSessionId: 'another-session-id',
      senderUserId: '@another-user-id:example.com',
    });

    await expect(messagesPromise).resolves.toEqual([
      {
        type: 'example_type',
        content: { key: 'value' },
        senderSessionId: 'session-id',
        senderUserId: '@user-id:example.com',
      },
      {
        type: 'example_type',
        content: { key: 'another-value' },
        senderSessionId: 'another-session-id',
        senderUserId: '@another-user-id:example.com',
      },
    ]);
  });

  it('should send messages to own peer connection', async () => {
    joinedSubject.next(ownSession);
    await waitForSessionExists(statisticsSubject);

    const anotherSession: MatrixRtcSession = {
      sessionId: 'another-session-id',
      userId: '@another-user-id:example-1.com',
      memberId: '$member-id-0',
      livekitTransport: {
        livekitServiceUrl: 'https://livekit-jwt.example-1.com',
      },
    };
    joinedSubject.next(anotherSession);

    await vi.waitFor(() => {
      statisticsAnotherSubject.next({
        ...peerConnectionStatistics,
        remoteParticipantIdentities: ['another-session-id'],
      });
      expect(
        Object.values(channel.getStatistics().peerConnections).length,
      ).toBe(2);
    });

    channel.broadcastMessage('example_type', { key: 'value' }, undefined);

    expect(peerConnection.sendMessage).toHaveBeenCalledWith(
      'example_type',
      {
        key: 'value',
      },
      undefined,
    );
    expect(peerConnectionAnother.sendMessage).not.toHaveBeenCalled();
  });

  it('should leave after destroying', async () => {
    joinedSubject.next(ownSession);
    await waitForSessionExists(statisticsSubject);

    const messagesPromise = firstValueFrom(
      channel.observeMessages().pipe(toArray()),
    );
    const statisticsPromise = firstValueFrom(
      channel.observeStatistics().pipe(toArray()),
    );

    channel.destroy();

    await expect(messagesPromise).resolves.toEqual([]);
    await expect(statisticsPromise).resolves.toEqual([]);
    await vi.waitFor(() => {
      expect(sessionManager.leave).toHaveBeenCalled();
    });
  });

  /**
   * Waits for channel statistics to be updated,
   * so peer connection is created and received the statistics.
   */
  async function waitForSessionExists(
    statisticsSubject: Subject<Partial<PeerConnectionStatistics>>,
  ) {
    await vi.waitFor(() => {
      statisticsSubject.next(peerConnectionStatistics);
      expect(
        Object.values(channel.getStatistics().peerConnections).length,
      ).toBe(1);
    });
  }
});

function mockPeerConnection({
  remoteSessionId = 'remote-session-id',
  connectionId = 'connection-id',
  messageSubject,
  statisticsSubject: incomingStatisticsSubject,
}: {
  remoteSessionId?: string;
  remoteUserId?: string;
  connectionId?: string;
  messageSubject: Subject<Message>;
  statisticsSubject: Subject<Partial<PeerConnectionStatistics>>;
}): Mocked<PeerConnection> {
  const statisticsSubject = new Subject<PeerConnectionStatistics>();
  const statistics: PeerConnectionStatistics = {
    bytesReceived: 0,
    bytesSent: 0,
    packetsReceived: 0,
    packetsSent: 0,
    connectionState: 'disconnected',
  };

  function updateStatistics(update: Partial<PeerConnectionStatistics>): void {
    if (Object.keys(update).length > 0) {
      Object.assign(statistics, update);

      statisticsSubject.next(clone(statistics));
    }
  }

  incomingStatisticsSubject.subscribe((incomingStatistics) => {
    updateStatistics(incomingStatistics);
  });

  return {
    getRemoteSessionId: vi.fn(() => remoteSessionId),
    getConnectionId: vi.fn().mockReturnValue(connectionId),
    close: vi.fn().mockImplementation(() => {
      statisticsSubject.complete();
    }),
    sendMessage: vi.fn(),
    observeMessages: vi.fn().mockReturnValue(messageSubject),
    observeStatistics: vi.fn().mockReturnValue(statisticsSubject),
    observeConnectionState: vi.fn(),
  };
}
