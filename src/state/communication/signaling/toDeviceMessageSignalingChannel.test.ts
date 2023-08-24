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
import { firstValueFrom, toArray } from 'rxjs';
import {
  mockConnectionSignalingCandidates,
  mockConnectionSignalingDescription,
} from '../../../lib/testUtils/matrixTestUtils';
import { MockRTCIceCandidate } from '../../../lib/testUtils/webRtcMock';
import { ToDeviceMessageSignalingChannel } from './toDeviceMessageSignalingChannel';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('ToDeviceMessageSignalingChannel', () => {
  describe('unencrypted', () => {
    let channel: ToDeviceMessageSignalingChannel;

    beforeEach(() => {
      channel = new ToDeviceMessageSignalingChannel(widgetApi);
    });

    it('should send candidate', async () => {
      await channel.sendCandidates(
        '@peer-user-id',
        '@peer-session-id',
        '@connection-id',
        [
          new RTCIceCandidate({ candidate: 'candidate-0' }),
          new RTCIceCandidate({ candidate: 'candidate-1' }),
          null,
        ],
      );

      expect(widgetApi.sendToDeviceMessage).toBeCalledWith(
        'net.nordeck.whiteboard.connection_signaling',
        false,
        {
          '@peer-user-id': {
            '*': mockConnectionSignalingCandidates({
              sessionId: '@peer-session-id',
            }).content,
          },
        },
      );
    });

    it('should send description', async () => {
      await channel.sendDescription(
        '@peer-user-id',
        '@peer-session-id',
        '@connection-id',
        new RTCSessionDescription({
          type: 'offer',
          sdp: 'sdp',
        }),
      );

      expect(widgetApi.sendToDeviceMessage).toBeCalledWith(
        'net.nordeck.whiteboard.connection_signaling',
        false,
        {
          '@peer-user-id': {
            '*': mockConnectionSignalingDescription({
              sessionId: '@peer-session-id',
            }).content,
          },
        },
      );
    });

    it('should receive candidates', async () => {
      const signalingPromise = firstValueFrom(
        channel.observeSignaling(
          '@peer-user-id',
          '@session-id',
          '@connection-id',
        ),
      );

      widgetApi.mockSendToDeviceMessage(mockConnectionSignalingCandidates());

      await expect(signalingPromise).resolves.toEqual({
        candidates: [
          new MockRTCIceCandidate({ candidate: 'candidate-0' }),
          new MockRTCIceCandidate({ candidate: 'candidate-1' }),
          null,
        ],
        description: undefined,
      });
    });

    it('should receive description', async () => {
      const signalingPromise = firstValueFrom(
        channel.observeSignaling(
          '@peer-user-id',
          '@session-id',
          '@connection-id',
        ),
      );

      widgetApi.mockSendToDeviceMessage(mockConnectionSignalingDescription());

      await expect(signalingPromise).resolves.toEqual({
        candidates: undefined,
        description: new RTCSessionDescription({ type: 'offer', sdp: 'sdp' }),
      });
    });

    it('should return recent messages on subscribe', async () => {
      widgetApi.mockSendToDeviceMessage(mockConnectionSignalingDescription());

      await expect(
        firstValueFrom(
          channel.observeSignaling(
            '@peer-user-id',
            '@session-id',
            '@connection-id',
          ),
        ),
      ).resolves.toEqual({
        candidates: undefined,
        description: new RTCSessionDescription({ type: 'offer', sdp: 'sdp' }),
      });
    });

    it('should ignore unrelated signaling messages', async () => {
      const signalingPromise = firstValueFrom(
        channel.observeSignaling(
          '@peer-user-id',
          '@session-id',
          '@connection-id',
        ),
      );

      widgetApi.mockSendToDeviceMessage(
        mockConnectionSignalingDescription({ sender: '@another-user-id' }),
      );
      widgetApi.mockSendToDeviceMessage(
        mockConnectionSignalingDescription({
          sessionId: '@another-session-id',
        }),
      );
      widgetApi.mockSendToDeviceMessage(
        mockConnectionSignalingDescription({
          connectionId: '@another-connection-id',
        }),
      );
      widgetApi.mockSendToDeviceMessage(mockConnectionSignalingDescription());

      await expect(signalingPromise).resolves.toEqual({
        candidates: undefined,
        description: new RTCSessionDescription({ type: 'offer', sdp: 'sdp' }),
      });
    });

    it('should ignore invalid signaling messages', async () => {
      const signalingPromise = firstValueFrom(
        channel.observeSignaling(
          '@peer-user-id',
          '@session-id',
          '@connection-id',
        ),
      );

      widgetApi.mockSendToDeviceMessage(
        mockConnectionSignalingDescription({
          description: {
            type: 'wrongType' as 'offer',
          },
        }),
      );

      widgetApi.mockSendToDeviceMessage(mockConnectionSignalingDescription());

      await expect(signalingPromise).resolves.toEqual({
        candidates: undefined,
        description: new RTCSessionDescription({ type: 'offer', sdp: 'sdp' }),
      });
    });

    it('should close observables', async () => {
      const signalingPromise = firstValueFrom(
        channel
          .observeSignaling('@peer-user-id', '@session-id', '@connection-id')
          .pipe(toArray()),
      );

      channel.destroy();

      await expect(signalingPromise).resolves.toEqual([]);
    });
  });

  describe('encrypted', () => {
    let channel: ToDeviceMessageSignalingChannel;

    beforeEach(() => {
      channel = new ToDeviceMessageSignalingChannel(widgetApi, 10000, true);
    });

    it('should send encrypted messages if encryption is active', async () => {
      await channel.sendDescription(
        '@peer-user-id',
        '@peer-session-id',
        '@connection-id',
        new RTCSessionDescription({
          type: 'offer',
          sdp: 'sdp',
        }),
      );

      const { content, type } = mockConnectionSignalingDescription({
        sessionId: '@peer-session-id',
      });

      expect(widgetApi.sendToDeviceMessage).toBeCalledWith(
        'net.nordeck.whiteboard.connection_signaling',
        true,
        {
          '@peer-user-id': {
            '*': { content, type },
          },
        },
      );
    });

    it('should only receive encrypted messages if encryption is active', async () => {
      const signalingPromise = firstValueFrom(
        channel.observeSignaling(
          '@peer-user-id',
          '@session-id',
          '@connection-id',
        ),
      );

      widgetApi.mockSendToDeviceMessage(mockConnectionSignalingDescription());
      widgetApi.mockSendToDeviceMessage(
        mockConnectionSignalingDescription({
          encrypted: true,
          description: { type: 'offer', sdp: 'encrypted-sdp' },
        }),
      );

      await expect(signalingPromise).resolves.toEqual({
        candidates: undefined,
        description: new RTCSessionDescription({
          type: 'offer',
          sdp: 'encrypted-sdp',
        }),
      });
    });
  });
});
