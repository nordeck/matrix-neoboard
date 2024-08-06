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
import { createMigrations } from './migrations';
import { SharedMap, YMap } from './types';
import { YDocument } from './yDocument';

type ExampleMapEntry = { num?: number; text?: string };

type Example = {
  map: YMap<ExampleMapEntry>;
};

function initMigration(doc: SharedMap<Example>) {
  doc.set('map', new YMap());
}

const exampleMigrations = createMigrations([initMigration], '0');

describe('YDocumentUndoManager', () => {
  it('should undo and redo an operation', () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');

    const yUndoManager = yDoc.getUndoManager();

    expect(yDoc.getData().toJSON()).toEqual({
      map: {},
    });

    yDoc.performChange((doc) => {
      doc.get('map').set('key-1', { text: 'first' });
    });

    expect(yDoc.getData().toJSON()).toEqual({
      map: { 'key-1': { text: 'first' } },
    });

    yUndoManager.undo();

    expect(yDoc.getData().toJSON()).toEqual({
      map: {},
    });

    yUndoManager.redo();

    expect(yDoc.getData().toJSON()).toEqual({
      map: { 'key-1': { text: 'first' } },
    });
  });

  it('should emit the document observe subjects after undo', async () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');

    const yUndoManager = yDoc.getUndoManager();

    yDoc.performChange((doc) => {
      doc.get('map').set('key-1', { text: 'first' });
    });

    const changes = firstValueFrom(
      yDoc.observeChanges().pipe(map((d) => d.toJSON())),
    );
    const persist = firstValueFrom(yDoc.observePersist());
    const publish = firstValueFrom(yDoc.observePublish());

    yUndoManager.undo();

    await expect(publish).resolves.toEqual(expect.any(Uint8Array));
    await expect(persist).resolves.toEqual(yDoc);
    await expect(changes).resolves.toEqual({ map: {} });
  });

  it('should emit the document observe subjects after redo', async () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');

    const yUndoManager = yDoc.getUndoManager();

    yDoc.performChange((doc) => {
      doc.get('map').set('key-1', { text: 'first' });
    });

    yUndoManager.undo();

    const changes = firstValueFrom(
      yDoc.observeChanges().pipe(map((d) => d.toJSON())),
    );
    const persist = firstValueFrom(yDoc.observePersist());
    const publish = firstValueFrom(yDoc.observePublish());

    yUndoManager.redo();

    await expect(publish).resolves.toEqual(expect.any(Uint8Array));
    await expect(persist).resolves.toEqual(yDoc);
    await expect(changes).resolves.toEqual({
      map: { 'key-1': { text: 'first' } },
    });
  });

  it('should restore the stored context on undo and redo', async () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');
    const undoManager = yDoc.getUndoManager();

    yDoc.performChange((doc) => {
      doc.get('map').set('element-1', { num: 0 });
      doc.get('map').set('element-2', { num: 0 });
      doc.get('map').set('element-3', { num: 0 });
      doc.get('map').set('element-4', { num: 0 });
    });

    undoManager.setContext({ mapEntry: 'element-1' });
    yDoc.performChange((doc) => {
      doc.get('map').set('element-1', { num: 10 });
    });

    undoManager.setContext({ mapEntry: 'element-2' });
    yDoc.performChange((doc) => {
      doc.get('map').set('element-2', { num: 25 });
    });

    undoManager.setContext({ mapEntry: 'element-3' });
    yDoc.performChange((doc) => {
      doc.get('map').set('element-3', { num: 30 });
    });

    undoManager.setContext({ mapEntry: 'element-4' });

    expect(yDoc.getData().toJSON()).toEqual({
      map: {
        'element-1': { num: 10 },
        'element-2': { num: 25 },
        'element-3': { num: 30 },
        'element-4': { num: 0 },
      },
    });

    {
      const undoContext = firstValueFrom(undoManager.onPop());
      undoManager.undo();
      expect(await undoContext).toEqual({ mapEntry: 'element-3' });
      expect(yDoc.getData().toJSON().map['element-3'].num).toBe(0);
    }

    {
      const undoContext = firstValueFrom(undoManager.onPop());
      undoManager.undo();
      expect(await undoContext).toEqual({ mapEntry: 'element-2' });
      expect(yDoc.getData().toJSON().map['element-2'].num).toBe(0);
    }

    {
      const undoContext = firstValueFrom(undoManager.onPop());
      undoManager.redo();
      expect(await undoContext).toEqual({ mapEntry: 'element-2' });
      expect(yDoc.getData().toJSON().map['element-2'].num).toBe(25);
    }

    {
      const undoContext = firstValueFrom(undoManager.onPop());
      undoManager.redo();
      expect(await undoContext).toEqual({ mapEntry: 'element-3' });
      expect(yDoc.getData().toJSON().map['element-3'].num).toBe(30);
    }

    {
      const undoContext = firstValueFrom(undoManager.onPop());
      undoManager.undo();
      expect(await undoContext).toEqual({ mapEntry: 'element-3' });
      expect(yDoc.getData().toJSON().map['element-3'].num).toBe(0);
    }
  });

  it('should skip invalid values for the undo context', async () => {
    const yDoc = YDocument.create<Example>(exampleMigrations, '0');
    const undoManager = yDoc.getUndoManager();

    undoManager.setContext(true);
    yDoc.performChange((doc) => {
      doc.get('map').set('element-1', { num: 0 });
    });

    undoManager.setContext(false);
    yDoc.performChange((doc) => {
      doc.get('map').set('element-1', { num: 10 });
    });

    undoManager.setContext(true);
    yDoc.performChange((doc) => {
      doc.get('map').set('element-1', { num: 25 });
    });

    const validate = (context: unknown): context is true => context === true;
    const undoContextValues = firstValueFrom(
      undoManager.onPop(validate).pipe(take(2), toArray()),
    );

    undoManager.undo(); // true
    undoManager.undo(); // false (ignored)
    undoManager.undo(); // true

    expect(await undoContextValues).toEqual([true, true]);
  });

  it('should cleanup the undo and redo stack after the document changes', async () => {
    const checkUndoItem = jest.fn().mockReturnValue(true);
    const checkRedoItem = jest.fn().mockReturnValue(true);
    const keepUndoRedoItem = jest.fn();

    function setupMock() {
      checkUndoItem.mockClear();
      checkRedoItem.mockClear();
      keepUndoRedoItem.mockReset();

      keepUndoRedoItem
        .mockReturnValueOnce(checkUndoItem)
        .mockReturnValueOnce(checkRedoItem);
    }

    const yDoc = YDocument.create<Example>(
      exampleMigrations,
      '0',
      keepUndoRedoItem,
    );
    const undoManager = yDoc.getUndoManager();

    // add element-1 -> one insertion, no deletion
    setupMock();
    yDoc.performChange((doc) => {
      doc.get('map').set('element-1', { num: 10 });
    });
    expect(keepUndoRedoItem).toHaveBeenCalledTimes(2);
    expect(keepUndoRedoItem).toHaveBeenCalledWith(yDoc.getData());
    expect(checkUndoItem).toHaveBeenCalledTimes(1);
    expect(checkUndoItem).toHaveBeenNthCalledWith(1, [
      { props: ['map', 'element-1'], isDeletion: false, isInsertion: true },
    ]);
    expect(checkRedoItem).toHaveBeenCalledTimes(0);

    // change element-1 -> one insertion, one deletion
    setupMock();
    yDoc.performChange((doc) => {
      doc.get('map').set('element-1', { num: 25 });
    });
    expect(keepUndoRedoItem).toHaveBeenCalledTimes(2);
    expect(checkUndoItem).toHaveBeenCalledTimes(2);
    expect(checkUndoItem).toHaveBeenNthCalledWith(1, [
      { props: ['map', 'element-1'], isDeletion: true, isInsertion: true },
    ]);
    expect(checkUndoItem).toHaveBeenNthCalledWith(2, [
      { props: ['map', 'element-1'], isDeletion: false, isInsertion: true },
    ]);
    expect(checkRedoItem).toHaveBeenCalledTimes(0);

    // delete element-1 -> no insertion, one deletion
    // add element-2 -> one insertion, no deletion
    setupMock();
    yDoc.performChange((doc) => {
      doc.get('map').delete('element-1');
      doc.get('map').set('element-2', { num: 30 });
    });
    expect(keepUndoRedoItem).toHaveBeenCalledTimes(2);
    expect(checkUndoItem).toHaveBeenCalledTimes(3);
    expect(checkUndoItem).toHaveBeenNthCalledWith(1, [
      { props: ['map', 'element-1'], isDeletion: true, isInsertion: false },
      { props: ['map', 'element-2'], isDeletion: false, isInsertion: true },
    ]);
    expect(checkUndoItem).toHaveBeenNthCalledWith(2, [
      { props: ['map', 'element-1'], isDeletion: true, isInsertion: true },
    ]);
    expect(checkUndoItem).toHaveBeenNthCalledWith(3, [
      { props: ['map', 'element-1'], isDeletion: false, isInsertion: true },
    ]);
    expect(checkRedoItem).toHaveBeenCalledTimes(0);

    // undo last operation will add reverse to the redo stack
    // delete element-2 -> no insertion, one deletion
    // add element-1 -> one insertion, no deletion
    setupMock();
    undoManager.undo();
    expect(keepUndoRedoItem).toHaveBeenCalledTimes(2);
    expect(checkUndoItem).toHaveBeenCalledTimes(2);
    expect(checkUndoItem).toHaveBeenNthCalledWith(1, [
      { props: ['map', 'element-1'], isDeletion: true, isInsertion: true },
    ]);
    expect(checkUndoItem).toHaveBeenNthCalledWith(2, [
      { props: ['map', 'element-1'], isDeletion: false, isInsertion: true },
    ]);
    expect(checkRedoItem).toHaveBeenCalledTimes(1);
    expect(checkRedoItem).toHaveBeenNthCalledWith(1, [
      { props: ['map', 'element-2'], isDeletion: true, isInsertion: false },
      { props: ['map', 'element-1'], isDeletion: false, isInsertion: true },
    ]);
  });

  describe('observeState', () => {
    it('should emit new state after a change was stored', async () => {
      const yDoc = YDocument.create<Example>(exampleMigrations, '0');

      const yUndoManager = yDoc.getUndoManager();

      const state = firstValueFrom(
        yUndoManager.observeState().pipe(take(2), toArray()),
      );

      yDoc.performChange((doc) => {
        doc.get('map').set('key-1', { text: 'first' });
      });

      expect(await state).toEqual([
        { canUndo: false, canRedo: false },
        { canUndo: true, canRedo: false },
      ]);
    });

    it('should emit new state after undo was called', async () => {
      const yDoc = YDocument.create<Example>(exampleMigrations, '0');

      const yUndoManager = yDoc.getUndoManager();

      yDoc.performChange((doc) => {
        doc.get('map').set('key-1', { text: 'first' });
      });

      const state = firstValueFrom(
        yUndoManager.observeState().pipe(take(2), toArray()),
      );

      yUndoManager.undo();

      expect(await state).toEqual([
        { canUndo: true, canRedo: false },
        { canUndo: false, canRedo: true },
      ]);
    });

    it('should emit new state after undo was called with a conflicted stack item', async () => {
      const yDoc = YDocument.create<Example>(exampleMigrations, '0');

      const yUndoManager = yDoc.getUndoManager();

      yDoc.performChange((doc) => {
        doc.get('map').set('key-1', { text: 'first' });
      });

      const remoteDocument = yDoc.clone();
      remoteDocument.performChange((doc) => {
        doc.get('map').set('key-1', { text: 'second' });
      });
      yDoc.mergeFrom(remoteDocument.store());

      const state = firstValueFrom(
        yUndoManager.observeState().pipe(take(2), toArray()),
      );

      yUndoManager.undo();

      expect(await state).toEqual([
        { canUndo: true, canRedo: false },
        { canUndo: false, canRedo: false },
      ]);
    });

    it('should emit new state after redo was called', async () => {
      const yDoc = YDocument.create<Example>(exampleMigrations, '0');

      const yUndoManager = yDoc.getUndoManager();

      yDoc.performChange((doc) => {
        doc.get('map').set('key-1', { text: 'first' });
      });

      yUndoManager.undo();

      const state = firstValueFrom(
        yUndoManager.observeState().pipe(take(2), toArray()),
      );

      yUndoManager.redo();

      expect(await state).toEqual([
        { canUndo: false, canRedo: true },
        { canUndo: true, canRedo: false },
      ]);
    });

    it('should emit new state after redo was called with a conflicted stack item', async () => {
      const yDoc = YDocument.create<Example>(exampleMigrations, '0');

      const yUndoManager = yDoc.getUndoManager();

      yDoc.performChange((doc) => {
        doc.get('map').set('key-1', { text: 'first' });
      });

      yUndoManager.undo();

      const remoteDocument = yDoc.clone();
      remoteDocument.performChange((doc) => {
        doc.get('map').set('key-1', { text: 'second' });
      });
      yDoc.mergeFrom(remoteDocument.store());

      const state = firstValueFrom(
        yUndoManager.observeState().pipe(take(2), toArray()),
      );

      yUndoManager.redo();

      expect(await state).toEqual([
        { canUndo: false, canRedo: true },
        { canUndo: false, canRedo: false },
      ]);
    });

    it('should emit new state after the stack cleanup was executed', async () => {
      const remoteDocument = YDocument.create<Example>(exampleMigrations, '0');
      remoteDocument.performChange((doc) => {
        doc.get('map').set('key-1', { text: 'first' });
      });

      const keepUndoRedoItem = jest.fn().mockReturnValue(() => true);
      const yDoc = YDocument.create<Example>(
        exampleMigrations,
        '0',
        keepUndoRedoItem,
      );

      const yUndoManager = yDoc.getUndoManager();

      yDoc.performChange((doc) => {
        doc.get('map').set('key-1', { text: 'first' });
      });
      yDoc.performChange((doc) => {
        doc.get('map').set('key-1', { text: 'second' });
      });
      yUndoManager.undo();

      const state = firstValueFrom(
        yUndoManager.observeState().pipe(take(2), toArray()),
      );

      keepUndoRedoItem.mockReturnValue(() => false);
      yDoc.mergeFrom(remoteDocument.store());

      expect(await state).toEqual([
        { canUndo: true, canRedo: true },
        { canUndo: false, canRedo: false },
      ]);
    });
  });
});
