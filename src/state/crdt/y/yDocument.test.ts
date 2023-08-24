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

import { firstValueFrom, map, take, toArray } from 'rxjs';
import * as Y from 'yjs';
import { createMigrations } from './migrations';
import { SharedMap, YText } from './types';
import { YDocument } from './yDocument';

type Example = {
  num: number;
  text: YText;
};

function initMigration(doc: SharedMap<Example>) {
  doc.set('num', 5);
  doc.set('text', new Y.Text());
}

const exampleMigrations = createMigrations([initMigration], '0');

describe('YDocument', () => {
  it('should apply migrations', () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');

    expect(yDoc.getData().toJSON()).toEqual({
      num: 5,
      text: '',
    });
  });

  it('should perform change', async () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');
    const changes = firstValueFrom(
      yDoc.observeChanges().pipe(map((d) => d.toJSON())),
    );
    const persist = firstValueFrom(yDoc.observePersist());
    const publish = firstValueFrom(yDoc.observePublish());

    yDoc.performChange((doc) => {
      doc.get('text').insert(0, 'HELLO');
    });

    await expect(publish).resolves.toEqual(expect.any(Uint8Array));
    await expect(persist).resolves.toEqual(yDoc);
    await expect(changes).resolves.toEqual({
      num: 5,
      text: 'HELLO',
    });
    expect(yDoc.getData().toJSON()).toEqual({
      num: 5,
      text: 'HELLO',
    });
  });

  it('should handle errors in perform change callback', async () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');
    const changes = firstValueFrom(
      yDoc.observeChanges().pipe(map((d) => d.toJSON())),
    );
    const persist = firstValueFrom(yDoc.observePersist());
    const publish = firstValueFrom(yDoc.observePublish());

    expect(() => {
      yDoc.performChange((doc) => {
        throw new Error();
      });
    }).toThrowError();

    // Do a second change to verify that the first try did not trigger any
    // events.
    yDoc.performChange((doc) => {
      doc.get('text').insert(0, 'HELLO');
    });

    await expect(publish).resolves.toEqual(expect.any(Uint8Array));
    await expect(persist).resolves.toEqual(yDoc);
    await expect(changes).resolves.toEqual({
      num: 5,
      text: 'HELLO',
    });
    expect(yDoc.getData().toJSON()).toEqual({
      num: 5,
      text: 'HELLO',
    });
  });

  it('should apply change', async () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');
    const changes = firstValueFrom(
      yDoc.observeChanges().pipe(map((d) => d.toJSON())),
    );

    yDoc.applyChange(await mockChange());

    await expect(changes).resolves.toEqual({
      num: 5,
      text: 'HELLO',
    });
    expect(yDoc.getData().toJSON()).toEqual({
      num: 5,
      text: 'HELLO',
    });
  });

  it('should skip apply change if the resulting document is invalid', async () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');
    const changes = firstValueFrom(
      yDoc.observeChanges().pipe(map((d) => d.toJSON())),
    );

    yDoc.applyChange(await mockChange(), (_): _ is YDocument<Example> => false);
    yDoc.applyChange(await mockChange(), (_): _ is YDocument<Example> => true);

    await expect(changes).resolves.toEqual({
      num: 5,
      text: 'HELLO',
    });
    expect(yDoc.getData().toJSON()).toEqual({
      num: 5,
      text: 'HELLO',
    });
  });

  it('should catch all errors on apply change', async () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');

    expect(() => {
      yDoc.applyChange(new Uint8Array([1, 2, 3, 4]));
    }).not.toThrow();

    expect(yDoc.getData().toJSON()).toEqual({
      num: 5,
      text: '',
    });
  });

  it('should merge from remote document', async () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');
    const changes = firstValueFrom(
      yDoc.observeChanges().pipe(map((d) => d.toJSON())),
    );

    yDoc.mergeFrom(mockRemoteData());

    await expect(changes).resolves.toEqual({
      num: 5,
      text: 'HELLO',
    });
    expect(yDoc.getData().toJSON()).toEqual({
      num: 5,
      text: 'HELLO',
    });
  });

  it('should merge from remote document and notify if there are further local changes', async () => {
    const remoteData = mockRemoteData();
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');
    const persist = firstValueFrom(yDoc.observePersist());

    yDoc.performChange((doc) => {
      doc.set('num', 10);
    });
    yDoc.mergeFrom(remoteData);

    await expect(persist).resolves.toEqual(yDoc);
    expect(yDoc.getData().toJSON()).toEqual({
      num: 10,
      text: 'HELLO',
    });
  });

  it('should throw error if merge fails', async () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');
    expect(() => yDoc.mergeFrom(new Uint8Array([1, 2, 3, 4]))).toThrowError();
  });

  it('should only capture performed changes for the undo manager', async () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');
    const yUndoManager = yDoc.getUndoManager();

    expect(await firstValueFrom(yUndoManager.observeState())).toEqual({
      canUndo: false,
      canRedo: false,
    });

    yDoc.applyChange(await mockChange());
    expect(await firstValueFrom(yUndoManager.observeState())).toEqual({
      canUndo: false,
      canRedo: false,
    });

    yDoc.mergeFrom(mockRemoteData());
    expect(await firstValueFrom(yUndoManager.observeState())).toEqual({
      canUndo: false,
      canRedo: false,
    });

    yDoc.performChange((doc) => {
      doc.set('num', 10);
    });
    expect(await firstValueFrom(yUndoManager.observeState())).toEqual({
      canUndo: true,
      canRedo: false,
    });
  });

  it('should emit statistics', async () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');
    const statisticsPromise = firstValueFrom(
      yDoc.observeStatistics().pipe(take(2), toArray()),
    );

    yDoc.applyChange(await mockChange());

    const statistics = await statisticsPromise;
    expect(statistics).toHaveLength(2);
    const [first, second] = statistics;
    expect(first.contentSizeInBytes).toBe(19);
    expect(first.documentSizeInBytes).toBe(26);
    expect(second.contentSizeInBytes).toBe(24);
    // documentSizeInBytes is not fully deterministic, therefore we do a bounds
    // check. The size depends on the clientID generated for the current
    // session, that might be encoded with a variable length.
    expect(second.documentSizeInBytes).toBeGreaterThanOrEqual(42);
    expect(second.documentSizeInBytes).toBeLessThanOrEqual(43);
  });

  it('should clone the document', () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');

    const copy = yDoc.clone();
    expect(yDoc.store()).toEqual(copy.store());

    yDoc.performChange((doc) => doc.set('num', 10));
    expect(yDoc.store()).not.toEqual(copy.store());
  });
});

async function mockChange(): Promise<Uint8Array> {
  const yDoc = YDocument.create<Example>(exampleMigrations, '0');
  const publish = firstValueFrom(yDoc.observePublish());

  yDoc.performChange((doc) => {
    doc.get('text').insert(0, 'HELLO');
  });

  return await publish;
}

function mockRemoteData(): Uint8Array {
  const yDoc = YDocument.create<Example>(exampleMigrations, '0');

  yDoc.performChange((doc) => {
    doc.get('text').insert(0, 'HELLO');
  });

  return yDoc.store();
}
