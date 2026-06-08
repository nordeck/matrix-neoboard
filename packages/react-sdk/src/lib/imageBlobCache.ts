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

type CacheEntry = {
  // Shared promise so concurrent acquires for the same mxc await one download.
  promise: Promise<string>;
  // The resolved blob URL, set once the download completes.
  url: string | undefined;
  refCount: number;
};

const cache = new Map<string, CacheEntry>();

/**
 * Acquire a blob URL for the given MXC URI.
 *
 * If another component already downloaded (or is downloading) the same MXC,
 * the existing promise is reused — no duplicate network request is made.
 * Increments the reference count; call {@link releaseImageUrl} when done.
 *
 * The download function must NOT be tied to any individual component's
 * AbortSignal — the promise is shared across all components rendering the same
 * MXC. Component lifecycle is handled via the `cancelled` flag at call sites.
 *
 * @param mxc - The Matrix Content URI to download.
 * @param download - Async function that performs the actual download and returns
 *   a blob URL. Only called on the first acquire for a given mxc.
 */
export async function acquireImageUrl(
  mxc: string,
  download: () => Promise<string>,
): Promise<string> {
  let entry = cache.get(mxc);

  if (!entry) {
    const promise = download()
      .then((url) => {
        const e = cache.get(mxc);
        if (e) {
          e.url = url;
        } else {
          // All references were released before the download completed;
          // revoke the blob URL immediately to avoid a leak.
          URL.revokeObjectURL(url);
        }
        return url;
      })
      .catch((error: unknown) => {
        // Remove failed entries so the next acquire can start fresh.
        cache.delete(mxc);
        throw error;
      });

    entry = { promise, url: undefined, refCount: 0 };
    cache.set(mxc, entry);
  }

  entry.refCount++;
  return entry.promise;
}

/**
 * Release a previously acquired blob URL.
 *
 * Decrements the reference count. When the count reaches zero the blob URL is
 * revoked and the cache entry is removed, freeing the memory.
 *
 * Safe to call even if the download is still in flight or has already failed —
 * in those cases the entry is either absent or will clean up on completion.
 */
export function releaseImageUrl(mxc: string): void {
  const entry = cache.get(mxc);
  if (!entry) return;

  entry.refCount--;

  if (entry.refCount <= 0) {
    cache.delete(mxc);
    if (entry.url) {
      URL.revokeObjectURL(entry.url);
    }
    // If entry.url is still undefined the download is in flight.
    // The .then() handler above will detect the deleted entry and
    // revoke the blob URL as soon as it is created.
  }
}
