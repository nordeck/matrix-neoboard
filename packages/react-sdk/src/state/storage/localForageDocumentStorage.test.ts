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

import { LocalForageDocumentStorage } from './localForageDocumentStorage';

describe('LocalForageDocumentStorage', () => {
  let storage: LocalForageDocumentStorage;

  beforeEach(() => {
    window.localStorage.clear();

    storage = new LocalForageDocumentStorage(4);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should store a document', async () => {
    const document = new Uint8Array([0, 0, 0, 0]);

    await storage.store('document', document);

    await expect(storage.load('document')).resolves.toEqual(document);
  });

  it('should not fail storing is not possible', async () => {
    const document = new Uint8Array([0, 0, 0, 0]);

    jest
      .spyOn(window.localStorage.__proto__, 'setItem')
      .mockImplementation(() => {
        throw new Error();
      });

    await storage.store('document', document);

    await expect(storage.load('document')).resolves.toEqual(undefined);
  });

  it('should replace a document', async () => {
    const document0 = new Uint8Array([0, 0, 0, 0]);
    const document1 = new Uint8Array([1, 1, 1, 1]);

    await storage.store('document', document0);
    await storage.store('document', document1);

    await expect(storage.load('document')).resolves.toEqual(document1);
  });

  it('should return undefined if document is not in storage', async () => {
    await expect(storage.load('document0')).resolves.toEqual(undefined);
  });

  it('should return undefined if reading from storage fails', async () => {
    jest
      .spyOn(window.localStorage.__proto__, 'getItem')
      .mockImplementation(() => {
        throw new Error();
      });

    await expect(storage.load('document0')).resolves.toEqual(undefined);
  });

  it('should evict the least recently used document if size limit is reached', async () => {
    const document0 = new Uint8Array([0, 0, 0, 0]);
    const document1 = new Uint8Array([1, 1, 1, 1]);
    const document2 = new Uint8Array([2, 2, 2, 2]);
    const document3 = new Uint8Array([3, 3, 3, 3]);
    const document4 = new Uint8Array([4, 4, 4, 4]);
    const document5 = new Uint8Array([5, 5, 5, 5]);

    await storage.store('document0', document0);
    await storage.store('document1', document1);
    await storage.store('document2', document2);
    await storage.store('document3', document3);

    await storage.store('document4', document4);

    await expect(storage.load('document0')).resolves.toEqual(undefined);
    await expect(storage.load('document1')).resolves.toEqual(document1);

    await storage.store('document5', document5);

    await expect(storage.load('document2')).resolves.toEqual(undefined);
  });
});
