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

import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import AutoDiscovery from './autodiscovery';

describe('AutoDiscovery', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    const mockFetch = vi.fn();
    AutoDiscovery.setFetchFn(mockFetch);
  });

  afterEach(() => {
    AutoDiscovery.setFetchFn(originalFetch);
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
});
