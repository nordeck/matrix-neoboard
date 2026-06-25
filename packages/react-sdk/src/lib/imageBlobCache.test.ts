/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { acquireImageUrl, releaseImageUrl } from './imageBlobCache';

describe('imageBlobCache', () => {
  beforeEach(() => {
    vi.spyOn(URL, 'createObjectURL').mockImplementation(
      () => 'blob:mock-url-' + Math.random(),
    );
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('acquireImageUrl', () => {
    it('calls download exactly once for the same mxc even with concurrent acquires', async () => {
      const download = vi.fn().mockResolvedValue('blob:url-1');

      const [url1, url2, url3] = await Promise.all([
        acquireImageUrl('mxc://a', download),
        acquireImageUrl('mxc://a', download),
        acquireImageUrl('mxc://a', download),
      ]);

      expect(download).toHaveBeenCalledTimes(1);
      expect(url1).toBe(url2);
      expect(url1).toBe(url3);

      // cleanup
      releaseImageUrl('mxc://a');
      releaseImageUrl('mxc://a');
      releaseImageUrl('mxc://a');
    });

    it('calls download again after all references are released', async () => {
      const download = vi
        .fn()
        .mockResolvedValueOnce('blob:url-first')
        .mockResolvedValueOnce('blob:url-second');

      await acquireImageUrl('mxc://b', download);
      releaseImageUrl('mxc://b');

      const url = await acquireImageUrl('mxc://b', download);

      expect(download).toHaveBeenCalledTimes(2);
      expect(url).toBe('blob:url-second');

      releaseImageUrl('mxc://b');
    });

    it('calls download independently for different mxc values', async () => {
      const download = vi
        .fn()
        .mockResolvedValueOnce('blob:url-x')
        .mockResolvedValueOnce('blob:url-y');

      const [urlX, urlY] = await Promise.all([
        acquireImageUrl('mxc://x', download),
        acquireImageUrl('mxc://y', download),
      ]);

      expect(download).toHaveBeenCalledTimes(2);
      expect(urlX).toBe('blob:url-x');
      expect(urlY).toBe('blob:url-y');

      releaseImageUrl('mxc://x');
      releaseImageUrl('mxc://y');
    });

    it('retries download after a previous download failed', async () => {
      const download = vi
        .fn()
        .mockRejectedValueOnce(new Error('network error'))
        .mockResolvedValueOnce('blob:url-retry');

      await expect(acquireImageUrl('mxc://c', download)).rejects.toThrow(
        'network error',
      );

      const url = await acquireImageUrl('mxc://c', download);
      expect(download).toHaveBeenCalledTimes(2);
      expect(url).toBe('blob:url-retry');

      releaseImageUrl('mxc://c');
    });
  });

  describe('releaseImageUrl', () => {
    it('revokes the blob URL when the last reference is released', async () => {
      const download = vi.fn().mockResolvedValue('blob:to-revoke');

      await acquireImageUrl('mxc://d', download);
      await acquireImageUrl('mxc://d', download);

      expect(URL.revokeObjectURL).not.toHaveBeenCalled();

      releaseImageUrl('mxc://d');
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();

      releaseImageUrl('mxc://d');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:to-revoke');
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    });

    it('does not revoke the blob URL while references remain', async () => {
      const download = vi.fn().mockResolvedValue('blob:held');

      await acquireImageUrl('mxc://e', download);
      await acquireImageUrl('mxc://e', download);
      await acquireImageUrl('mxc://e', download);

      releaseImageUrl('mxc://e');
      releaseImageUrl('mxc://e');

      expect(URL.revokeObjectURL).not.toHaveBeenCalled();

      releaseImageUrl('mxc://e');
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:held');
    });

    it('is a no-op when called for an unknown mxc', () => {
      expect(() => releaseImageUrl('mxc://nonexistent')).not.toThrow();
      expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    });

    it('revokes immediately if all refs are released before download completes', async () => {
      let resolveDownload!: (url: string) => void;
      const download = vi.fn().mockReturnValue(
        new Promise<string>((resolve) => {
          resolveDownload = resolve;
        }),
      );

      // acquire but release before the download finishes
      acquireImageUrl('mxc://f', download);
      releaseImageUrl('mxc://f');

      // now let the download complete
      resolveDownload('blob:late-url');
      // flush microtasks
      await Promise.resolve();
      await Promise.resolve();

      // the blob URL should have been revoked immediately since no refs remain
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:late-url');
    });
  });
});
