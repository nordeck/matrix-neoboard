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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  mockConnectionSignalingCandidates,
  mockConnectionSignalingDescription,
} from '../../../lib/testUtils/matrixTestUtils';
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
        '@peer-user-id:example.com',
        '@peer-session-id:example.com',
        '@connection-id:example.com',
        [
          new RTCIceCandidate({
            candidate:
              'candidate:702786350 2 udp 41819902 8.8.8.8 60769 typ relay raddr 8.8.8.8',
            sdpMLineIndex: null,
            sdpMid: null,
            usernameFragment: null,
          }),
          new RTCIceCandidate({
            candidate:
              'candidate:635070278 2 udp 99024181 8.8.8.8 60769 typ relay raddr 8.8.8.8',
            sdpMLineIndex: null,
            sdpMid: null,
            usernameFragment: null,
          }),
          null,
        ],
      );

      expect(widgetApi.sendToDeviceMessage).toHaveBeenCalledWith(
        'net.nordeck.whiteboard.connection_signaling',
        false,
        {
          '@peer-user-id:example.com': {
            '*': mockConnectionSignalingCandidates({
              sessionId: '@peer-session-id:example.com',
            }).content,
          },
        },
      );
    });

    it('should send description', async () => {
      await channel.sendDescription(
        '@peer-user-id:example.com',
        '@peer-session-id:example.com',
        '@connection-id:example.com',
        new RTCSessionDescription({
          type: 'offer',
          sdp: 'sdp',
        }),
      );

      expect(widgetApi.sendToDeviceMessage).toHaveBeenCalledWith(
        'net.nordeck.whiteboard.connection_signaling',
        false,
        {
          '@peer-user-id:example.com': {
            '*': mockConnectionSignalingDescription({
              sessionId: '@peer-session-id:example.com',
            }).content,
          },
        },
      );
    });

    it('should receive candidates', async () => {
      const signalingPromise = firstValueFrom(
        channel.observeSignaling(
          '@peer-user-id:example.com',
          '@session-id:example.com',
          '@connection-id:example.com',
        ),
      );

      widgetApi.mockSendToDeviceMessage(mockConnectionSignalingCandidates());

      await expect(signalingPromise).resolves.toMatchObject({
        candidates: [
          expect.objectContaining({
            candidate:
              'candidate:702786350 2 udp 41819902 8.8.8.8 60769 typ relay raddr 8.8.8.8',
            sdpMLineIndex: null,
            sdpMid: null,
            usernameFragment: null,
          }),
          expect.objectContaining({
            candidate:
              'candidate:635070278 2 udp 99024181 8.8.8.8 60769 typ relay raddr 8.8.8.8',
            sdpMLineIndex: null,
            sdpMid: null,
            usernameFragment: null,
          }),
          null,
        ],
        description: undefined,
      });
    });

    it('should receive description', async () => {
      const signalingPromise = firstValueFrom(
        channel.observeSignaling(
          '@peer-user-id:example.com',
          '@session-id:example.com',
          '@connection-id:example.com',
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
            '@peer-user-id:example.com',
            '@session-id:example.com',
            '@connection-id:example.com',
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
          '@peer-user-id:example.com',
          '@session-id:example.com',
          '@connection-id:example.com',
        ),
      );

      widgetApi.mockSendToDeviceMessage(
        mockConnectionSignalingDescription({
          sender: '@another-user-id:example.com',
        }),
      );
      widgetApi.mockSendToDeviceMessage(
        mockConnectionSignalingDescription({
          sessionId: '@another-session-id:example.com',
        }),
      );
      widgetApi.mockSendToDeviceMessage(
        mockConnectionSignalingDescription({
          connectionId: '@another-connection-id:example.com',
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
          '@peer-user-id:example.com',
          '@session-id:example.com',
          '@connection-id:example.com',
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
          .observeSignaling(
            '@peer-user-id:example.com',
            '@session-id:example.com',
            '@connection-id:example.com',
          )
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
        '@peer-user-id:example.com',
        '@peer-session-id:example.com',
        '@connection-id:example.com',
        new RTCSessionDescription({
          type: 'offer',
          sdp: 'sdp',
        }),
      );

      const { content, type } = mockConnectionSignalingDescription({
        sessionId: '@peer-session-id:example.com',
      });

      expect(widgetApi.sendToDeviceMessage).toHaveBeenCalledWith(
        'net.nordeck.whiteboard.connection_signaling',
        true,
        {
          '@peer-user-id:example.com': {
            '*': { content, type },
          },
        },
      );
    });

    it('should only receive encrypted messages if encryption is active', async () => {
      const signalingPromise = firstValueFrom(
        channel.observeSignaling(
          '@peer-user-id:example.com',
          '@session-id:example.com',
          '@connection-id:example.com',
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
