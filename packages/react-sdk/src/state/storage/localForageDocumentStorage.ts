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

import { createInstance } from 'localforage';
import { getLogger } from 'loglevel';
import { DocumentStorage } from './types';

type LocalForage = ReturnType<typeof createInstance>;

/**
 * This storage key is used to store an array of keys, ordered from the most
 * recently used to the least recently used. Every time we access a key, we move
 * it to the front of the list. We ensure that the list is never exceeding the
 * size limit, if we do, we cut of the least recently used keys at the end.
 */
const LRU_KEYS = 'lru';

/**
 * A document storage that implements a least recently used (LRU) semantic on
 * top of local forage.
 */
export class LocalForageDocumentStorage implements DocumentStorage {
  private readonly logger = getLogger('DocumentStorage');
  private readonly documentStore: LocalForage;

  constructor(private readonly cacheSize = 128) {
    this.documentStore = createInstance({
      name: 'documentCache',
      storeName: 'documents',
    });
  }

  async store(documentId: string, data: Uint8Array): Promise<void> {
    try {
      await this.documentStore.setItem(documentId, data);
      await this.touchKey(documentId);
      // Due to exceeding the size limit or eventually consistency, we can end up
      // with keys that are not in the LRU keys list. As we don't have
      // transactions, our read and write operations might run in parallel with
      // other operations, causing inconsistencies in the data. These entries can
      // be deleted.
      await this.collectGarbage();
    } catch (err) {
      this.logger.warn('Could not write to storage', err);
    }
  }

  async load(documentId: string): Promise<Uint8Array | undefined> {
    try {
      const document = await this.documentStore.getItem<Uint8Array>(documentId);
      if (!document) {
        return undefined;
      }

      await this.touchKey(documentId);
      return document;
    } catch (err) {
      this.logger.warn('Could not read from storage', err);
      return undefined;
    }
  }

  private async touchKey(key: string): Promise<void> {
    const lruKeys = await this.getLRUKeys();
    await this.setLRUKeys(touchKey(lruKeys, key).slice(0, this.cacheSize));
  }

  private async collectGarbage(): Promise<void> {
    const lruKeys = await this.getLRUKeys();
    const allKeys = await this.documentStore.keys();

    for (const key of allKeys) {
      if (key === LRU_KEYS) {
        continue;
      }

      if (lruKeys.includes(key)) {
        continue;
      }

      await this.documentStore.removeItem(key);
    }
  }

  private async getLRUKeys(): Promise<string[]> {
    const keys = await this.documentStore.getItem(LRU_KEYS);

    this.documentStore.keys();

    if (keys && Array.isArray(keys)) {
      return keys;
    }

    return [];
  }

  private async setLRUKeys(keys: string[]): Promise<void> {
    await this.documentStore.setItem(LRU_KEYS, keys);
  }
}

function touchKey(lruKeys: string[], key: string): string[] {
  return [key, ...lruKeys.filter((id) => id !== key)];
}
