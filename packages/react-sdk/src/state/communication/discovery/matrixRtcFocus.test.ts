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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AutoDiscovery from './autodiscovery';
import {
  getWellKnownFoci,
  isLivekitFocusConfig,
  makeFociPreferred,
  RTCFocus,
} from './matrixRtcFocus';

vi.mock('./autodiscovery');
vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

describe('matrixRtcFocus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('getWellKnownFoci', () => {
    const mockAutoDiscovery = vi.mocked(AutoDiscovery);

    it('should return empty array when no client config is found', async () => {
      mockAutoDiscovery.getRawClientConfig.mockResolvedValue({});

      const result = await getWellKnownFoci('example.com');

      expect(result).toEqual([]);
    });

    it('should return empty array when client config has no foci', async () => {
      const clientConfig = {
        'm.homeserver': { base_url: 'https://matrix.example.com' },
      };
      mockAutoDiscovery.getRawClientConfig.mockResolvedValue(clientConfig);

      const result = await getWellKnownFoci('example.com');

      expect(result).toEqual([]);
    });

    it('should handle different focus types', async () => {
      const clientConfig = {
        'org.matrix.msc4143.rtc_foci': [
          {
            type: 'livekit',
            livekit_service_url: 'https://livekit.example.com',
          },
          {
            type: 'full_mesh',
          },
        ],
      };
      mockAutoDiscovery.getRawClientConfig.mockResolvedValue(clientConfig);

      const result = await getWellKnownFoci('example.com');

      expect(result).toEqual([
        {
          type: 'livekit',
          livekit_service_url: 'https://livekit.example.com',
        },
        {
          type: 'full_mesh',
        },
      ]);
    });
  });

  describe('makeFociPreferred', () => {
    const memberFocus: RTCFocus = {
      type: 'livekit',
      livekit_service_url: 'https://member.livekit.example.com',
    };
    const wellKnownFoci: RTCFocus[] = [
      {
        type: 'livekit',
        livekit_service_url: 'https://wellknown1.livekit.example.com',
      },
      {
        type: 'livekit',
        livekit_service_url: 'https://wellknown2.livekit.example.com',
      },
    ];

    beforeEach(() => {
      vi.mocked(getEnvironment).mockImplementation(
        (_, defaultValue) => defaultValue,
      );
    });

    it('should return only member focus when no well-known foci and no env var', () => {
      const result = makeFociPreferred(memberFocus, []);

      expect(result).toEqual([memberFocus]);
    });

    it('should return only well-known foci when no member focus and no env var', () => {
      const result = makeFociPreferred(undefined, wellKnownFoci);

      expect(result).toEqual([
        {
          type: 'livekit',
          livekit_service_url: 'https://wellknown1.livekit.example.com',
        },
        {
          type: 'livekit',
          livekit_service_url: 'https://wellknown2.livekit.example.com',
        },
      ]);
    });

    it('should return member focus first, then well-known foci', () => {
      const result = makeFociPreferred(memberFocus, wellKnownFoci);

      expect(result).toEqual([
        memberFocus,
        {
          type: 'livekit',
          livekit_service_url: 'https://wellknown1.livekit.example.com',
        },
        {
          type: 'livekit',
          livekit_service_url: 'https://wellknown2.livekit.example.com',
        },
      ]);
    });

    it('should add environment variable focus when provided', () => {
      const envServiceUrl = 'https://env.livekit.example.com';
      vi.mocked(getEnvironment).mockImplementation((_value) => {
        return envServiceUrl;
      });

      const result = makeFociPreferred(memberFocus, wellKnownFoci);

      expect(result).toEqual([
        memberFocus,
        {
          type: 'livekit',
          livekit_service_url: 'https://wellknown1.livekit.example.com',
        },
        {
          type: 'livekit',
          livekit_service_url: 'https://wellknown2.livekit.example.com',
        },
        {
          type: 'livekit',
          livekit_service_url: envServiceUrl,
        },
      ]);
    });

    it('should remove duplicate foci', () => {
      const envServiceUrl = 'https://wellknown1.livekit.example.com';
      vi.mocked(getEnvironment).mockImplementation((_value) => {
        return envServiceUrl;
      });

      const duplicateWellKnownFoci: RTCFocus[] = [
        {
          type: 'livekit',
          livekit_service_url: 'https://wellknown1.livekit.example.com', // same as the env foci
        },
        {
          type: 'livekit',
          livekit_service_url: 'https://member.livekit.example.com', // same as the member focus
        },
      ];

      const result = makeFociPreferred(memberFocus, duplicateWellKnownFoci);

      expect(result).toEqual([
        {
          type: 'livekit',
          livekit_service_url: 'https://member.livekit.example.com',
        },
        {
          type: 'livekit',
          livekit_service_url: 'https://wellknown1.livekit.example.com',
        },
      ]);
    });

    it('should handle empty inputs', () => {
      const result = makeFociPreferred(undefined, []);

      expect(result).toEqual([]);
    });
  });

  describe('isLivekitFocusConfig', () => {
    it('should return true for valid LivekitFocusConfig objects', () => {
      const validConfig: RTCFocus = {
        type: 'livekit',
        livekit_service_url: 'https://livekit.example.com',
      };

      expect(isLivekitFocusConfig(validConfig)).toBe(true);
    });

    it('should return false for non-livekit type', () => {
      const invalidType: RTCFocus = {
        type: 'full_mesh',
      };

      expect(isLivekitFocusConfig(invalidType)).toBe(false);
    });

    it('should return false when livekit_service_url is missing', () => {
      const missingUrl: RTCFocus = {
        type: 'livekit',
      };

      expect(isLivekitFocusConfig(missingUrl)).toBe(false);
    });

    it('should return true when additional properties are present', () => {
      const extraProps: RTCFocus = {
        type: 'livekit',
        livekit_service_url: 'https://livekit.example.com',
        additional_property: 'value',
      };

      expect(isLivekitFocusConfig(extraProps)).toBe(true);
    });
  });
});
