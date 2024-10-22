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

import { waitFor } from '@testing-library/react';
import { bufferTime, firstValueFrom, Subject, take, toArray } from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  MockInstance,
  vi,
} from 'vitest';
import {
  mockRtcDataChannel,
  MockRtcDataChannel,
  mockRtcPeerConnection,
  MockRtcPeerConnection,
} from '../../../lib/testUtils/webRtcMock';
import { SignalingChannel } from '../signaling';
import { WebRtcPeerConnection } from './webRtcPeerConnection';

describe('WebRtcPeerConnection', () => {
  const politeSessionId = 'session-a';
  const impoliteSessionId = 'session-b';
  let rtcPeerConnection: MockRtcPeerConnection;
  let rtcDataChannel: MockRtcDataChannel;
  let signalingChannel: Mocked<SignalingChannel>;
  let signalingSubject: Subject<{
    description?: RTCSessionDescription | undefined;
    candidates?: (RTCIceCandidate | null)[] | undefined;
  }>;
  let connectionSpy: MockInstance<
    (
      this: RTCPeerConnection,
      configuration?: RTCConfiguration | undefined,
    ) => RTCPeerConnection
  >;

  beforeEach(() => {
    signalingSubject = new Subject();
    signalingChannel = {
      destroy: vi.fn(),
      observeSignaling: vi.fn().mockReturnValue(signalingSubject),
      sendCandidates: vi.fn(),
      sendDescription: vi.fn(),
    };

    rtcPeerConnection = mockRtcPeerConnection();
    rtcDataChannel = mockRtcDataChannel('0');
    rtcPeerConnection.createDataChannel.mockReturnValue(rtcDataChannel);

    connectionSpy = vi
      .spyOn(window, 'RTCPeerConnection')
      .mockReturnValue(rtcPeerConnection);
  });

  it('should pass fallback stun server to WebRTC on creation', () => {
    const connection = new WebRtcPeerConnection(
      signalingChannel,
      { sessionId: politeSessionId, userId: '@other-user' },
      impoliteSessionId,
    );

    expect(connectionSpy).toHaveBeenCalledWith({
      iceServers: [
        {
          urls: ['stun:turn.matrix.org'],
        },
      ],
    });

    connection.close();
  });

  it('should pass turn servers to WebRTC on creation', () => {
    const turnServer = {
      urls: ['turn:turn.example.com'],
      credential: 'credential',
      username: 'username',
    };
    const connection = new WebRtcPeerConnection(
      signalingChannel,
      { sessionId: politeSessionId, userId: '@other-user' },
      impoliteSessionId,
      { turnServer },
    );

    expect(connectionSpy).toHaveBeenCalledWith({
      iceServers: [turnServer],
    });

    connection.close();
  });

  it('should close connection', async () => {
    const connection = new WebRtcPeerConnection(
      signalingChannel,
      { sessionId: politeSessionId, userId: '@other-user' },
      impoliteSessionId,
    );

    const statisticsPromise = firstValueFrom(
      connection.observeStatistics().pipe(toArray()),
    );
    const messagesPromise = firstValueFrom(
      connection.observeMessages().pipe(toArray()),
    );

    connection.close();

    expect(rtcPeerConnection.close).toHaveBeenCalled();
    await expect(statisticsPromise).resolves.toEqual(expect.any(Array));
    await expect(messagesPromise).resolves.toEqual([]);
  });

  describe('negotiation (impolite)', () => {
    let connection: WebRtcPeerConnection;

    beforeEach(() => {
      connection = new WebRtcPeerConnection(
        signalingChannel,
        { sessionId: politeSessionId, userId: '@other-user' },
        impoliteSessionId,
      );
    });

    afterEach(() => {
      connection.close();
      vi.resetAllMocks();
    });

    it('should create data channel', () => {
      expect(rtcPeerConnection.createDataChannel).toHaveBeenCalledWith('0');
    });

    it('should perform negotiation', async () => {
      rtcPeerConnection.emitNegotiationNeeded();

      expect(rtcPeerConnection.setLocalDescription).toHaveBeenCalled();

      await waitFor(() =>
        expect(signalingChannel.sendDescription).toHaveBeenCalledWith(
          '@other-user',
          'session-a',
          'session-b_session-a',
          new RTCSessionDescription({ type: 'offer', sdp: 'sdp' }),
        ),
      );

      signalingSubject.next({
        description: new RTCSessionDescription({ type: 'answer', sdp: 'sdp' }),
      });

      await waitFor(() => {
        expect(rtcPeerConnection.setRemoteDescription).toHaveBeenCalledWith({
          sdp: 'sdp',
          type: 'answer',
        });
      });
    });

    it('should ignore incoming offer mid negotiation', async () => {
      rtcPeerConnection.emitNegotiationNeeded();

      expect(rtcPeerConnection.setLocalDescription).toHaveBeenCalled();

      await waitFor(() =>
        expect(signalingChannel.sendDescription).toHaveBeenCalledWith(
          '@other-user',
          'session-a',
          'session-b_session-a',
          new RTCSessionDescription({ type: 'offer', sdp: 'sdp' }),
        ),
      );

      signalingSubject.next({
        description: new RTCSessionDescription({ type: 'offer', sdp: 'sdp' }),
      });

      signalingSubject.next({
        description: new RTCSessionDescription({ type: 'answer', sdp: 'sdp' }),
      });

      await waitFor(() => {
        expect(rtcPeerConnection.setRemoteDescription).toHaveBeenCalledTimes(1);
      });
      expect(rtcPeerConnection.setRemoteDescription).toHaveBeenCalledWith({
        sdp: 'sdp',
        type: 'answer',
      });
    });

    it('should process incoming offer outside of negotiation', async () => {
      signalingSubject.next({
        description: new RTCSessionDescription({ type: 'offer', sdp: 'sdp' }),
      });

      await waitFor(() => {
        expect(rtcPeerConnection.setRemoteDescription).toHaveBeenCalledWith({
          sdp: 'sdp',
          type: 'offer',
        });
      });

      await waitFor(() => {
        expect(rtcPeerConnection.setLocalDescription).toHaveBeenCalled();
      });

      await waitFor(() =>
        expect(signalingChannel.sendDescription).toHaveBeenCalledWith(
          '@other-user',
          'session-a',
          'session-b_session-a',
          new RTCSessionDescription({ type: 'answer', sdp: 'sdp' }),
        ),
      );
    });
  });

  describe('negotiation (polite)', () => {
    let connection: WebRtcPeerConnection;

    beforeEach(() => {
      connection = new WebRtcPeerConnection(
        signalingChannel,
        { sessionId: impoliteSessionId, userId: '@user-id' },
        politeSessionId,
      );
    });

    afterEach(() => {
      connection.close();
    });

    it('should accept data channel', async () => {
      expect(rtcPeerConnection.createDataChannel).not.toHaveBeenCalled();

      rtcPeerConnection.emitDataChannel(rtcDataChannel);

      // Check that the channel is used properly
      const messagePromise = firstValueFrom(connection.observeMessages());

      rtcDataChannel.emitMessage(
        '{"type":"com.example.test","content":{"key":"value"}}',
      );

      await expect(messagePromise).resolves.toEqual({
        content: {
          key: 'value',
        },
        senderSessionId: 'session-b',
        senderUserId: '@user-id',
        type: 'com.example.test',
      });
    });

    it('should perform negotiation and cancel on incoming offer', async () => {
      rtcPeerConnection.emitNegotiationNeeded();

      expect(rtcPeerConnection.setLocalDescription).toHaveBeenCalled();

      await waitFor(() =>
        expect(signalingChannel.sendDescription).toHaveBeenCalledWith(
          '@user-id',
          'session-b',
          'session-b_session-a',
          new RTCSessionDescription({ type: 'offer', sdp: 'sdp' }),
        ),
      );

      signalingSubject.next({
        description: new RTCSessionDescription({ type: 'offer', sdp: 'sdp' }),
      });

      await waitFor(() => {
        expect(rtcPeerConnection.setRemoteDescription).toHaveBeenCalledWith({
          sdp: 'sdp',
          type: 'offer',
        });
      });

      await waitFor(() => {
        expect(rtcPeerConnection.setLocalDescription).toHaveBeenCalled();
      });

      await waitFor(() =>
        expect(signalingChannel.sendDescription).toHaveBeenCalledWith(
          '@user-id',
          'session-b',
          'session-b_session-a',
          new RTCSessionDescription({ type: 'answer', sdp: 'sdp' }),
        ),
      );
    });

    it('should perform negotiation', async () => {
      rtcPeerConnection.emitNegotiationNeeded();

      expect(rtcPeerConnection.setLocalDescription).toHaveBeenCalled();

      await waitFor(() =>
        expect(signalingChannel.sendDescription).toHaveBeenCalledWith(
          '@user-id',
          'session-b',
          'session-b_session-a',
          new RTCSessionDescription({ type: 'offer', sdp: 'sdp' }),
        ),
      );

      signalingSubject.next({
        description: new RTCSessionDescription({ type: 'answer', sdp: 'sdp' }),
      });

      await waitFor(() => {
        expect(rtcPeerConnection.setRemoteDescription).toHaveBeenCalledWith({
          sdp: 'sdp',
          type: 'answer',
        });
      });
    });

    it('should process incoming offer outside of negotiation', async () => {
      signalingSubject.next({
        description: new RTCSessionDescription({ type: 'offer', sdp: 'sdp' }),
      });

      await waitFor(() => {
        expect(rtcPeerConnection.setRemoteDescription).toHaveBeenCalledWith({
          sdp: 'sdp',
          type: 'offer',
        });
      });

      await waitFor(() => {
        expect(rtcPeerConnection.setLocalDescription).toHaveBeenCalled();
      });

      await waitFor(() =>
        expect(signalingChannel.sendDescription).toHaveBeenCalledWith(
          '@user-id',
          'session-b',
          'session-b_session-a',
          new RTCSessionDescription({ type: 'answer', sdp: 'sdp' }),
        ),
      );
    });
  });

  describe('common', () => {
    const candidate0 = new RTCIceCandidate({ candidate: 'candidate-0' });
    const candidate1 = new RTCIceCandidate({ candidate: 'candidate-1' });
    const emptyCandidate = new RTCIceCandidate({ candidate: '' });
    let connection: WebRtcPeerConnection;

    beforeEach(() => {
      connection = new WebRtcPeerConnection(
        signalingChannel,
        { sessionId: politeSessionId, userId: '@other-user' },
        impoliteSessionId,
      );
    });

    afterEach(() => {
      connection.close();
    });

    it('should generate connection id', () => {
      expect(connection.getConnectionId()).toBe('session-b_session-a');
    });

    it('should batch ice candidates till the last candidate is received', () => {
      rtcPeerConnection.emitIceCandidate(candidate0);
      rtcPeerConnection.emitIceCandidate(candidate1);
      rtcPeerConnection.emitIceCandidate(null);

      expect(signalingChannel.sendCandidates).toHaveBeenCalledWith(
        '@other-user',
        'session-a',
        'session-b_session-a',
        [candidate0, candidate1, null],
      );
    });

    it('should batch ice candidates till the last candidate is received (Firefox)', () => {
      // Firefox uses empty string to indicate the end of candidates
      rtcPeerConnection.emitIceCandidate(candidate0);
      rtcPeerConnection.emitIceCandidate(emptyCandidate);

      expect(signalingChannel.sendCandidates).toHaveBeenCalledWith(
        '@other-user',
        'session-a',
        'session-b_session-a',
        [candidate0, emptyCandidate],
      );
    });

    it('should batch ice candidates for a time window', async () => {
      rtcPeerConnection.emitIceCandidate(candidate0);
      rtcPeerConnection.emitIceCandidate(candidate1);

      await waitFor(() => {
        expect(signalingChannel.sendCandidates).toHaveBeenCalledWith(
          '@other-user',
          'session-a',
          'session-b_session-a',
          [candidate0, candidate1],
        );
      });
    });

    it('should apply ice candidates', async () => {
      signalingSubject.next({
        candidates: [
          candidate0,
          candidate1,
          // Firefox will send an empty string, while Chrome uses null to
          // terminate the candidates
          emptyCandidate,
          null,
        ],
      });

      await waitFor(() => {
        expect(rtcPeerConnection.addIceCandidate).toHaveBeenCalledTimes(4);
      });
      expect(rtcPeerConnection.addIceCandidate).toHaveBeenNthCalledWith(
        1,
        candidate0,
      );
      expect(rtcPeerConnection.addIceCandidate).toHaveBeenNthCalledWith(
        2,
        candidate1,
      );
      expect(rtcPeerConnection.addIceCandidate).toHaveBeenNthCalledWith(
        3,
        emptyCandidate,
      );
      expect(rtcPeerConnection.addIceCandidate).toHaveBeenNthCalledWith(4);
    });

    it('should restart ice if ice connection state is failed', () => {
      rtcPeerConnection.updateIceConnectionState('failed');

      expect(rtcPeerConnection.restartIce).toHaveBeenCalled();
    });

    it('should send message', () => {
      connection.sendMessage('com.example.test', { key: 'value' });

      expect(rtcDataChannel.send).toHaveBeenCalledWith(
        '{"type":"com.example.test","content":{"key":"value"}}',
      );
    });

    it('should receive message', async () => {
      const messagePromise = firstValueFrom(connection.observeMessages());

      rtcDataChannel.emitMessage(
        '{"type":"com.example.test","content":{"key":"value"}}',
      );

      await expect(messagePromise).resolves.toEqual({
        content: {
          key: 'value',
        },
        senderSessionId: 'session-a',
        senderUserId: '@other-user',
        type: 'com.example.test',
      });
    });

    it('should ignore invalid payload JSON', async () => {
      const messagePromise = firstValueFrom(
        connection.observeMessages().pipe(bufferTime(100)),
      );

      rtcDataChannel.emitMessage('invalid-json');

      await expect(messagePromise).resolves.toEqual([]);
    });

    it('should ignore invalid payload schema', async () => {
      const messagePromise = firstValueFrom(
        connection.observeMessages().pipe(bufferTime(100)),
      );

      rtcDataChannel.emitMessage('{}');

      await expect(messagePromise).resolves.toEqual([]);
    });
  });

  describe('statistics', () => {
    let connection: WebRtcPeerConnection;

    beforeEach(() => {
      const report = new Map([
        [
          'transport-id',
          {
            type: 'transport',
            selectedCandidatePairId: 'candidate-pair-id',
          },
        ],
        [
          'candidate-pair-id',
          {
            type: 'candidate-pair',
            localCandidateId: 'local-candidate-id',
            remoteCandidateId: 'remote-candidate-id',
            packetsReceived: 1,
            bytesReceived: 2,
            packetsSent: 3,
            bytesSent: 4,
          },
        ],
      ]);
      rtcPeerConnection.getStats.mockResolvedValue(report);

      connection = new WebRtcPeerConnection(
        signalingChannel,
        { sessionId: politeSessionId, userId: '@other-user' },
        impoliteSessionId,
        { statisticsInterval: 100 },
      );
    });

    afterEach(() => {
      connection.close();
    });

    it('should handle connection state change', async () => {
      const statisticsPromise = firstValueFrom(connection.observeStatistics());

      rtcPeerConnection.updateConnectionState('connected');

      await expect(statisticsPromise).resolves.toMatchObject({
        connectionState: 'connected',
      });
    });

    it('should handle signaling state change', async () => {
      const statisticsPromise = firstValueFrom(connection.observeStatistics());

      rtcPeerConnection.updateSignalingState('have-local-offer');

      await expect(statisticsPromise).resolves.toMatchObject({
        signalingState: 'have-local-offer',
      });
    });

    it('should handle ice gathering state change', async () => {
      const statisticsPromise = firstValueFrom(connection.observeStatistics());

      rtcPeerConnection.updateIceGatheringState('complete');

      await expect(statisticsPromise).resolves.toMatchObject({
        iceGatheringState: 'complete',
      });
    });

    it('should handle ice connection state change', async () => {
      const statisticsPromise = firstValueFrom(connection.observeStatistics());

      rtcPeerConnection.updateIceConnectionState('connected');

      await expect(statisticsPromise).resolves.toMatchObject({
        iceConnectionState: 'connected',
      });
    });

    it('should handle data channel state change', async () => {
      const statisticsPromise = firstValueFrom(connection.observeStatistics());

      rtcDataChannel.readyState = 'closing';
      rtcDataChannel.emitConnectionEvent('closing');

      await expect(statisticsPromise).resolves.toMatchObject({
        dataChannelState: 'closing',
      });
    });

    it('should gather statistics regularly', async () => {
      const statisticsPromise = firstValueFrom(
        connection.observeStatistics().pipe(take(2), toArray()),
      );

      await expect(statisticsPromise).resolves.toMatchObject([
        expect.objectContaining({
          impolite: true,
          remoteUserId: '@other-user',
          remoteSessionId: 'session-a',
          packetsReceived: 1,
          bytesReceived: 2,
          packetsSent: 3,
          bytesSent: 4,
        }),
        expect.objectContaining({
          packetsReceived: 1,
          bytesReceived: 2,
          packetsSent: 3,
          bytesSent: 4,
        }),
      ]);
    });
  });
});
