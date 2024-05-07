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

import EventEmitter from 'events';
import { Description } from '../../model';

export type RTCIceCandidateInit = ReturnType<RTCIceCandidate['toJSON']>;

export class MockRTCIceCandidate implements RTCIceCandidate {
  address: string | null = null;
  candidate: string = '';
  component: RTCIceCandidate['component'] = null;
  foundation: string | null = null;
  port: number | null = null;
  priority: number | null = null;
  protocol: 'tcp' | 'udp' | null = null;
  relatedAddress: string | null = null;
  relatedPort: number | null = null;
  sdpMLineIndex: number | null = null;
  sdpMid: string | null = null;
  tcpType: RTCIceCandidate['tcpType'] = null;
  type: RTCIceCandidate['type'] = null;
  usernameFragment: string | null = null;

  constructor(init?: RTCIceCandidateInit) {
    if (init?.candidate) {
      this.candidate = init.candidate;
    }
  }

  toJSON(): RTCIceCandidateInit {
    return {
      candidate: this.candidate,
    };
  }
}

export class MockRTCSessionDescription implements RTCSessionDescription {
  readonly sdp: string;
  readonly type: RTCSessionDescription['type'];

  constructor(init: Description) {
    this.sdp = init.sdp ?? '';
    this.type = init.type;
  }

  toJSON(): Description {
    return { sdp: this.sdp, type: this.type };
  }
}

export type MockRtcDataChannel = jest.Mocked<RTCDataChannel> & {
  readyState: string;

  emitMessage: (data: string) => void;
  emitConnectionEvent: (type: 'open' | 'closing' | 'close') => void;
};

export function mockRtcDataChannel(label: string): MockRtcDataChannel {
  const emitter = new EventEmitter();

  const channel = {
    binaryType: 'arraybuffer',
    bufferedAmount: 0,
    bufferedAmountLowThreshold: 0,
    id: null,
    label,
    maxPacketLifeTime: null,
    maxRetransmits: null,
    negotiated: true,
    onbufferedamountlow: null,
    onclose: null,
    onerror: null,
    onclosing: null,
    onmessage: null,
    onopen: null,
    ordered: false,
    protocol: '',
    readyState: 'open',
    close: jest.fn(),
    send: jest.fn(),
    addEventListener: jest.fn((n, l) => {
      // We don't want to match the types here, just cast it:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emitter.addListener(n, l as any);
    }),
    removeEventListener: jest.fn((n, l) => {
      // We don't want to match the types here, just cast it:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emitter.removeListener(n, l as any);
    }),
    dispatchEvent: jest.fn(),
  } as jest.Mocked<RTCDataChannel>;

  const emitMessage = (data: string) => {
    emitter.emit('message', { data });
  };
  const emitConnectionEvent = (type: 'open' | 'closing' | 'close') => {
    emitter.emit(type, {});
  };

  return { ...channel, emitMessage, emitConnectionEvent };
}

export type RTCPeerConnectionState = RTCPeerConnection['connectionState'];
export type RTCSignalingState = RTCPeerConnection['signalingState'];
export type RTCIceGatheringState = RTCPeerConnection['iceGatheringState'];
export type RTCIceConnectionState = RTCPeerConnection['iceConnectionState'];

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export type MockRtcPeerConnection = jest.Mocked<RTCPeerConnection> & {
  emitIceCandidate(candidate: RTCIceCandidate | null): void;
  emitDataChannel(channel: RTCDataChannel): void;
  emitNegotiationNeeded(): void;
  updateConnectionState(state: RTCPeerConnectionState): void;
  updateSignalingState(state: RTCSignalingState): void;
  updateIceGatheringState(state: RTCIceGatheringState): void;
  updateIceConnectionState(state: RTCIceConnectionState): void;
};

export function mockRtcPeerConnection(): MockRtcPeerConnection {
  const emitter = new EventEmitter();
  const peerConnection = {
    canTrickleIceCandidates: null,
    connectionState: 'new',
    currentLocalDescription: null,
    currentRemoteDescription: null,
    iceConnectionState: 'new',
    iceGatheringState: 'new',
    localDescription: null,
    onconnectionstatechange: null,
    ondatachannel: null,
    onicecandidate: null,
    onicecandidateerror: null,
    oniceconnectionstatechange: null,
    onicegatheringstatechange: null,
    onnegotiationneeded: null,
    onsignalingstatechange: null,
    ontrack: null,
    pendingLocalDescription: null,
    pendingRemoteDescription: null,
    remoteDescription: null,
    sctp: null,
    signalingState: 'stable',
    addIceCandidate: jest.fn(),
    addTrack: jest.fn(),
    addTransceiver: jest.fn(),
    close: jest.fn(),
    createAnswer: jest.fn(),
    createDataChannel: jest.fn(),
    createOffer: jest.fn(),
    getConfiguration: jest.fn(),
    getReceivers: jest.fn(),
    getSenders: jest.fn(),
    getStats: jest.fn(async () => new Map()),
    getTransceivers: jest.fn(),
    removeTrack: jest.fn(),
    restartIce: jest.fn(),
    setConfiguration: jest.fn(),
    setLocalDescription: jest.fn(),
    setRemoteDescription: jest.fn(),
    addEventListener: jest.fn((n, l) => {
      // We don't want to match the types here, just cast it:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emitter.addListener(n, l as any);
    }),
    removeEventListener: jest.fn((n, l) => {
      // We don't want to match the types here, just cast it:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      emitter.removeListener(n, l as any);
    }),
    dispatchEvent: jest.fn(),
  } as jest.Mocked<Writeable<RTCPeerConnection>>;

  peerConnection.addIceCandidate.mockResolvedValue();

  peerConnection.setLocalDescription.mockImplementation(async () => {
    if (peerConnectionMock.remoteDescription) {
      peerConnectionMock.signalingState = 'stable';
      peerConnectionMock.localDescription = new RTCSessionDescription({
        type: 'answer',
        sdp: 'sdp',
      });
    } else {
      peerConnectionMock.signalingState = 'have-local-offer';
      peerConnectionMock.localDescription = new RTCSessionDescription({
        type: 'offer',
        sdp: 'sdp',
      });
    }
  });

  peerConnection.setRemoteDescription.mockImplementation(async (d) => {
    peerConnectionMock.signalingState = 'have-remote-offer';
    peerConnectionMock.remoteDescription = d
      ? new RTCSessionDescription(d)
      : null;
  });

  const updateConnectionState = (state: RTCPeerConnectionState) => {
    peerConnectionMock.connectionState = state;
    emitter.emit('connectionstatechange', {});
  };

  const updateSignalingState = (state: RTCSignalingState) => {
    peerConnectionMock.signalingState = state;
    emitter.emit('signalingstatechange', {});
  };

  const updateIceGatheringState = (state: RTCIceGatheringState) => {
    peerConnectionMock.iceGatheringState = state;
    emitter.emit('icegatheringstatechange', {});
  };

  const updateIceConnectionState = (state: RTCIceConnectionState) => {
    peerConnectionMock.iceConnectionState = state;
    emitter.emit('iceconnectionstatechange', {});
  };

  const emitIceCandidate = (candidate: RTCIceCandidate | null) => {
    emitter.emit('icecandidate', { candidate });
  };

  const emitDataChannel = (channel: RTCDataChannel) => {
    emitter.emit('datachannel', { channel });
  };

  const emitNegotiationNeeded = () => {
    emitter.emit('negotiationneeded', {});
  };

  const peerConnectionMock = {
    ...peerConnection,
    updateConnectionState,
    updateSignalingState,
    updateIceGatheringState,
    updateIceConnectionState,
    emitIceCandidate,
    emitDataChannel,
    emitNegotiationNeeded,
  };
  return peerConnectionMock;
}

// In jsdom, we don't have the WebRTC types available, therefore we mock the
// types ourself and register the mocked types globally:
window.RTCIceCandidate = MockRTCIceCandidate;
window.RTCSessionDescription = MockRTCSessionDescription;
// We only need the constructor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
window.RTCPeerConnection = mockRtcPeerConnection as any;
