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

import {
  extractPeerConnectionStatistics,
  isImpolite,
  isPeerConnected,
} from './utils';

describe('isImpolite', () => {
  it('should be polite if the session id is lower', () => {
    expect(isImpolite('aaaa', 'bbbb')).toBe(false);
  });

  it('should be impolite if the session id is higher', () => {
    expect(isImpolite('bbbb', 'aaaa')).toBe(true);
  });
});

describe('extractPeerConnectionStatistics', () => {
  it('should extract statistics according to spec', () => {
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
      [
        'local-candidate-id',
        {
          type: 'local-candidate',
          candidateType: 'relay',
        },
      ],
      [
        'remote-candidate-id',
        {
          type: 'remote-candidate',
          candidateType: 'host',
        },
      ],
    ]);
    const stats = extractPeerConnectionStatistics(report);

    expect(stats).toEqual({
      localCandidateType: 'relay',
      remoteCandidateType: 'host',
      packetsReceived: 1,
      bytesReceived: 2,
      packetsSent: 3,
      bytesSent: 4,
    });
  });

  it('should extract statistics compatible to Firefox', () => {
    const report = new Map([
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
          // Firefox has no transport, but a selected pair
          selected: true,
        },
      ],
      [
        'local-candidate-id',
        {
          type: 'local-candidate',
          candidateType: 'relay',
        },
      ],
      [
        'remote-candidate-id',
        {
          type: 'remote-candidate',
          candidateType: 'host',
        },
      ],
    ]);
    const stats = extractPeerConnectionStatistics(report);

    expect(stats).toEqual({
      localCandidateType: 'relay',
      remoteCandidateType: 'host',
      packetsReceived: 1,
      bytesReceived: 2,
      packetsSent: 3,
      bytesSent: 4,
    });
  });
});

describe('isPeerConnected', () => {
  it.each([
    { dataChannelState: 'open' },
    { connectionState: 'connected' },

    // support Firefox <v103
    { connectionState: undefined, iceConnectionState: 'connected' },
    { connectionState: undefined, iceConnectionState: 'completed' },
  ])('should accept %p', (patch: Partial<unknown>) => {
    expect(
      isPeerConnected({
        remoteUserId: '',
        remoteSessionId: '',
        impolite: true,
        packetsReceived: 0,
        bytesReceived: 0,
        packetsSent: 0,
        bytesSent: 0,
        connectionState: 'connected',
        signalingState: '',
        iceConnectionState: '',
        iceGatheringState: '',
        dataChannelState: 'open',
        ...patch,
      })
    ).toBe(true);
  });

  it.each([
    { dataChannelState: 'connecting' },
    { dataChannelState: 'closing' },
    { dataChannelState: 'closed' },
    { dataChannelState: undefined },
    { connectionState: 'new' },
    { connectionState: 'connecting' },
    { connectionState: 'disconnected' },
    { connectionState: 'failed' },
    { connectionState: 'closed' },

    // support Firefox <v103
    { connectionState: undefined, iceConnectionState: 'new' },
    { connectionState: undefined, iceConnectionState: 'checking' },
    { connectionState: undefined, iceConnectionState: 'failed' },
    { connectionState: undefined, iceConnectionState: 'disconnected' },
    { connectionState: undefined, iceConnectionState: 'closed' },
  ])('should reject %p', (patch: Partial<unknown>) => {
    expect(
      isPeerConnected({
        remoteUserId: '',
        remoteSessionId: '',
        impolite: true,
        packetsReceived: 0,
        bytesReceived: 0,
        packetsSent: 0,
        bytesSent: 0,
        connectionState: '',
        signalingState: '',
        iceConnectionState: '',
        iceGatheringState: '',
        dataChannelState: 'open',
        ...patch,
      })
    ).toBe(false);
  });
});
