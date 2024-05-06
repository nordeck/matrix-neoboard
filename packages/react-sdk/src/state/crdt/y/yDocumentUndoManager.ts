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

import { last } from 'lodash';
import { fromEvent, map, merge, mergeMap, Observable, of, Subject } from 'rxjs';
import * as Y from 'yjs';
import { DocumentUndoManager } from '../types';
import { SharedMap } from './types';

/** Set this scope on any Yjs action so it can be undo'ed. */
export const UNDO_MANAGER_SCOPE = 'net.nordeck.whiteboard';

type StackItem = Y.UndoManager['redoStack'][0];

/** A property that will be changed when this undo item will be applied */
export type StackItemChangeEntry = {
  /**
   * The property path that will be updated by this entry. The array contains the
   * property path beginning at the root of the document.
   *
   * Example: `{a: { b: 5 } }`, `a.b = 6` -> `props === ['a', 'b'];`
   */
  props: string[];

  /** If true, this entry was an addition (an edit is both a deletion and insertion) */
  isInsertion: boolean;

  /** If true, this entry was an deletion (an edit is both a deletion and insertion) */
  isDeletion: boolean;
};

/**
 * A validator that tells if the operation that is part of the undo item is
 * still applicable or should be dropped. This can be useful if a change might
 * be blocked by an external authorization change that happened after the
 * original operation was executed.
 */
export type UndoRedoItemValidator = (
  changes: StackItemChangeEntry[],
) => boolean;

export class YDocumentUndoManager<T> implements DocumentUndoManager {
  private readonly didOperationSubject = new Subject<void>();
  private readonly undoManager: Y.UndoManager = new Y.UndoManager(
    this.docRoot,
    { trackedOrigins: new Set([UNDO_MANAGER_SCOPE]), captureTimeout: 0 },
  );
  private context: unknown | undefined;

  constructor(
    private readonly doc: Y.Doc,
    private readonly docRoot: SharedMap<T>,
    /**
     * Provide a function to filter the stack. Will be called once for each
     * stack. The return function will be called in sequence for each stack
     * item, beginning at the item that will be undo/redo'ed next.
     */
    private readonly keepUndoRedoItem: (
      documentRoot: SharedMap<T>,
    ) => UndoRedoItemValidator = () => () => true,
    private readonly applyAndNotifyChanges: (changes: () => void) => void,
    private readonly documentDidChange: Observable<unknown>,
  ) {
    // save the current context (e.g. focused object) on the stack-item
    this.undoManager.on(
      'stack-item-added',
      (event: { stackItem: StackItem; type: 'undo' | 'redo' }) => {
        if (this.context !== undefined) {
          event.stackItem.meta.set('context', this.context);
        }
      },
    );

    this.documentDidChange.subscribe(() => {
      this.cleanupUndoRedoStacks();
    });
  }

  observeState(): Observable<{ canUndo: boolean; canRedo: boolean }> {
    return merge(
      of([undefined]),
      fromEvent(this.undoManager, 'stack-item-added'),
      fromEvent(this.undoManager, 'stack-item-popped'),
      fromEvent(this.undoManager, 'stack-cleared'),
      this.didOperationSubject,
    ).pipe(
      map(() => ({
        canUndo: this.undoManager.canUndo(),
        canRedo: this.undoManager.canRedo(),
      })),
    );
  }

  setContext<T>(context: T | undefined) {
    this.context = context;
  }

  onPop<T>(validation?: (context: unknown) => context is T): Observable<T> {
    return fromEvent(this.undoManager, 'stack-item-popped').pipe(
      mergeMap<unknown, T[]>((rawEvent) => {
        const [event] = rawEvent as [
          { stackItem: StackItem; type: 'undo' | 'redo' },
        ];

        const context = event.stackItem.meta.get('context');

        if (validation ? validation(context) : context !== undefined) {
          // This is a workaround for https://github.com/yjs/yjs/issues/353
          // Yjs will add the wrong context to the items that are created due to
          // a undo or redo operation.
          if (event.type === 'undo') {
            last(this.undoManager.redoStack)?.meta.set('context', context);
          } else if (event.type === 'redo') {
            last(this.undoManager.undoStack)?.meta.set('context', context);
          }

          return [context];
        }

        return [];
      }),
    );
  }

  undo(): void {
    this.applyAndNotifyChanges(() => {
      this.undoManager.undo();
    });

    // notify that the undoStack might be updated, even if the document was not
    // changed. This can happen if the undo item conflicted with remote changes
    // and were skipped by Yjs.
    this.didOperationSubject.next();
  }

  redo(): void {
    this.applyAndNotifyChanges(() => {
      this.undoManager.redo();
    });

    // notify that the redoStack might be updated, even if the document was not
    // changed. This can happen if the redo item conflicted with remote changes
    // and were skipped by Yjs.
    this.didOperationSubject.next();
  }

  clear(): void {
    this.undoManager.clear();
  }

  /**
   * Cleanup the undoStack and redoStack to remove all entries that do not
   * pass the `keepUndoRedoItem` check that was configured in the constructor.
   */
  private cleanupUndoRedoStacks(): void {
    this.doc.transact((transaction) => {
      const oldUndoStack = this.undoManager.undoStack;
      const oldRedoStack = this.undoManager.redoStack;

      this.undoManager.undoStack = this.filterUndoRedoStack(
        transaction,
        this.undoManager.undoStack,
      );

      this.undoManager.redoStack = this.filterUndoRedoStack(
        transaction,
        this.undoManager.redoStack,
      );

      // emit the notification that the stack was updated
      if (
        oldUndoStack !== this.undoManager.undoStack ||
        oldRedoStack !== this.undoManager.redoStack
      ) {
        this.undoManager.emit('stack-cleared', [
          { undoStackCleared: false, redoStackCleared: false },
        ]);
      }
    });
  }

  private filterUndoRedoStack(transaction: Y.Transaction, stack: StackItem[]) {
    const newStack = stack.slice();

    const keepStackItem = this.keepUndoRedoItem(this.docRoot);

    for (let i = newStack.length - 1; i >= 0; i--) {
      const item = newStack[i];

      const changes = calculateStackItemChanges(transaction, item);

      if (!keepStackItem(changes)) {
        newStack.splice(i, 1);
      }
    }

    return newStack.length === stack.length ? stack : newStack;
  }
}

/** Inspects a {@link StackItem} and extracts information about its contents. */
function calculateStackItemChanges(
  transaction: Y.Transaction,
  stackItem: StackItem,
): StackItemChangeEntry[] {
  const changes = new Map<string, StackItemChangeEntry>();

  function process(
    deletionSet: StackItem['deletions'],
    type: 'insertion' | 'deletion',
  ) {
    Y.iterateDeletedStructs(transaction, deletionSet, (iitem) => {
      let next: Y.GC | Y.Item | null = iitem;
      const propStack: string[] = [];

      while (next instanceof Y.Item) {
        if (next.parentSub) {
          propStack.unshift(next.parentSub);
        }
        next = next.parent instanceof Y.AbstractType ? next.parent._item : null;
      }

      if (propStack.length > 0) {
        const key = propStack.join('_');

        changes.set(key, {
          props: propStack,
          isInsertion: changes.get(key)?.isInsertion || type === 'insertion',
          isDeletion: changes.get(key)?.isDeletion || type === 'deletion',
        });
      }
    });
  }

  process(stackItem.deletions, 'deletion');
  process(stackItem.insertions, 'insertion');

  return [...changes.values()];
}
