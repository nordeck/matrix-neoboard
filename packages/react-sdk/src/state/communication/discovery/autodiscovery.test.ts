/*
 * Copyright 2025-2026 Nordeck IT + Consulting GmbH
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
import { IOpenIDCredentials } from 'matrix-widget-api';
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import AutoDiscovery from './autodiscovery';
import { LivekitFocus } from './matrixRtcFocus';

describe('AutoDiscovery', () => {
  let originalFetch: typeof globalThis.fetch;
  let widgetApi: MockedWidgetApi;
  let globalFetch: Mock;

  const activeFocus: LivekitFocus = {
    type: 'livekit',
    livekit_service_url: 'https://livekit-jwt.example.org',
    livekit_alias: '!room-id:example.com',
  };

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    const mockFetch = vi.fn();
    AutoDiscovery.setFetchFn(mockFetch);

    widgetApi = mockWidgetApi();
    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.deviceId = 'DEVICEID';

    // getLiveKitJWT uses the global fetch, not AutoDiscovery.fetch
    globalFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ url: 'wss://livekit.example.org', jwt: 'jwt' }),
    });
    vi.stubGlobal('fetch', globalFetch);
  });

  afterEach(() => {
    AutoDiscovery.setFetchFn(originalFetch);
    widgetApi.stop();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  describe('getRawClientConfig', () => {
    it('should handle .well-known 404 errors', async () => {
      (AutoDiscovery['fetchFn'] as Mock).mockImplementation((url) => {
        if (url === 'https://example.org/.well-known/matrix/client') {
          return Promise.resolve({
            ok: false,
            status: 404,
          });
        }
        return Promise.reject(new Error('Unexpected URL'));
      });

      const result = await AutoDiscovery.getRawClientConfig('example.org');
      expect(result).toEqual({});
    });

    it('should handle network errors', async () => {
      (AutoDiscovery['fetchFn'] as Mock).mockImplementation(() => {
        return Promise.reject(new Error('Network error'));
      });

      const result = await AutoDiscovery.getRawClientConfig('example.org');
      expect(result).toEqual({});
    });

    it('should throw error for invalid domain', async () => {
      await expect(AutoDiscovery.getRawClientConfig('')).rejects.toThrow(
        "'domain' must be a string of non-zero length",
      );
    });

    it('should fetch raw client config', async () => {
      const mockWellKnown = {
        'm.homeserver': { base_url: 'https://matrix.example.org' },
      };

      (AutoDiscovery['fetchFn'] as Mock).mockImplementation(() => {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockWellKnown),
        });
      });

      const result = await AutoDiscovery.getRawClientConfig('example.org');
      expect(result).toEqual(mockWellKnown);
    });
  });

  describe('getLiveKitJWT', () => {
    it('should only forward the credential fields of the OpenID token', async () => {
      // The widget API resolves the raw response data, which also carries
      // request metadata that the LiveKit JWT Token Service rejects.
      const openIdToken = {
        access_token: 'access-token',
        expires_in: 3600,
        matrix_server_name: 'example.com',
        token_type: 'Bearer',
        state: 'allowed',
        original_request_id: 'request-id',
      } as IOpenIDCredentials;

      await AutoDiscovery.getLiveKitJWT(
        widgetApi,
        'https://livekit-jwt.example.org',
        '!room-id:example.com',
        openIdToken,
      );

      const body = JSON.parse(globalFetch.mock.calls[0][1].body);
      expect(body.openid_token).toEqual({
        access_token: 'access-token',
        expires_in: 3600,
        matrix_server_name: 'example.com',
        token_type: 'Bearer',
      });
    });
  });

  describe('getSFUConfigWithOpenID', () => {
    it('should exchange the OpenID token of the widget API for an SFU config', async () => {
      widgetApi.requestOpenIDConnectToken.mockResolvedValue({
        access_token: 'access-token',
        expires_in: 3600,
        matrix_server_name: 'example.com',
        token_type: 'Bearer',
        // metadata added by the widget API that must not be forwarded
        state: 'allowed',
        original_request_id: 'request-id',
      } as IOpenIDCredentials);

      await expect(
        AutoDiscovery.getSFUConfigWithOpenID(widgetApi, activeFocus),
      ).resolves.toEqual({ url: 'wss://livekit.example.org', jwt: 'jwt' });

      expect(globalFetch).toHaveBeenCalledWith(
        'https://livekit-jwt.example.org/sfu/get',
        expect.anything(),
      );
      expect(JSON.parse(globalFetch.mock.calls[0][1].body)).toEqual({
        room: '!room-id:example.com',
        openid_token: {
          access_token: 'access-token',
          expires_in: 3600,
          matrix_server_name: 'example.com',
          token_type: 'Bearer',
        },
        device_id: 'DEVICEID',
      });
    });
  });
});
