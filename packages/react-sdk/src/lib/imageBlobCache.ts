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
 * @param mxc - The Matrix Content URI to download.
 * @param download - Async function that performs the actual download and returns
 *   a blob URL. Only called on the first acquire for a given mxc.
 * @param signal - AbortSignal; if aborted before the download resolves, the
 *   returned promise rejects with an AbortError.
 */
export async function acquireImageUrl(
  mxc: string,
  download: (signal: AbortSignal) => Promise<string>,
  signal: AbortSignal,
): Promise<string> {
  let entry = cache.get(mxc);

  if (!entry) {
    const promise = download(signal).then((url) => {
      const e = cache.get(mxc);
      if (e) {
        e.url = url;
      }
      return url;
    });

    entry = { promise, url: undefined, refCount: 0 };
    cache.set(mxc, entry);
  }

  entry.refCount++;

  // If the caller was aborted before the shared download finished, propagate
  // the abort without affecting other waiters.
  return Promise.race([
    entry.promise,
    new Promise<never>((_resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      signal.addEventListener('abort', () => reject(signal.reason), {
        once: true,
      });
    }),
  ]);
}

/**
 * Release a previously acquired blob URL.
 *
 * Decrements the reference count. When the count reaches zero the blob URL is
 * revoked and the cache entry is removed, freeing the memory.
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
  }
}
