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

import { getLogger } from 'loglevel';
import { concat, map, Observable, of, Subject } from 'rxjs';
import * as Y from 'yjs';
import {
  ChangeFn,
  Document,
  DocumentStatistics,
  DocumentUndoManager,
  DocumentValidator,
} from '../types';
import { applyMigrations } from './migrations';
import { SharedMap } from './types';
import {
  UNDO_MANAGER_SCOPE,
  UndoRedoItemValidator,
  YDocumentUndoManager,
} from './yDocumentUndoManager';

export class YDocument<T extends Record<string, unknown>>
  implements Document<T>
{
  private readonly logger = getLogger('YDocument');
  private readonly changesSubject = new Subject<SharedMap<T>>();
  private readonly publishSubject = new Subject<Uint8Array>();
  private readonly persistSubject = new Subject<Document<T>>();
  private readonly doc = new Y.Doc();
  private readonly undoManager = new YDocumentUndoManager<T>(
    this.doc,
    this.getRoot(),
    this.keepUndoRedoItem,
    this.applyAndNotifyChanges.bind(this),
    this.changesSubject
  );

  private constructor(
    private readonly documentVersion: string,
    private readonly keepUndoRedoItem?: (
      documentRoot: SharedMap<T>
    ) => UndoRedoItemValidator
  ) {}

  static create<T extends Record<string, unknown>>(
    migrations: Uint8Array[],
    documentVersion: string,
    keepUndoRedoItem?: (documentRoot: SharedMap<T>) => UndoRedoItemValidator
  ): YDocument<T> {
    const doc = new YDocument<T>(documentVersion, keepUndoRedoItem);

    applyMigrations(doc.doc, migrations);

    return doc;
  }

  applyChange(change: Uint8Array, isValid?: DocumentValidator<T>): void {
    try {
      if (isValid) {
        const copy = this.clone();
        copy.applyChange(change);

        if (!isValid(copy)) {
          return;
        }
      }

      Y.applyUpdate(this.doc, change);
      this.changesSubject.next(this.getRoot());
    } catch (ex) {
      this.logger.error('Error while applying change to document', ex);
    }
  }

  mergeFrom(remoteData: Uint8Array): void {
    const remoteDoc = new Y.Doc();
    Y.applyUpdate(remoteDoc, remoteData);
    const remoteSnapshot = Y.snapshot(remoteDoc);

    Y.applyUpdate(this.doc, remoteData);
    const appliedSnapshot = Y.snapshot(this.doc);

    const hasOutstandingLocalChanges = !Y.equalSnapshots(
      remoteSnapshot,
      appliedSnapshot
    );

    if (hasOutstandingLocalChanges) {
      this.persistSubject.next(this);
    }

    this.changesSubject.next(this.getRoot());
  }

  performChange(callback: ChangeFn<T>): void {
    this.applyAndNotifyChanges(() => {
      this.doc.transact((t) => callback(this.getRoot()), UNDO_MANAGER_SCOPE);
    });
  }

  store(): Uint8Array {
    const clone = new Y.Doc();
    Y.applyUpdate(clone, Y.encodeStateAsUpdate(this.doc));
    return Y.encodeStateAsUpdate(clone);
  }

  getData(): SharedMap<T> {
    return this.getRoot();
  }

  observePublish(): Observable<Uint8Array> {
    return this.publishSubject;
  }

  observeChanges(): Observable<SharedMap<T>> {
    return this.changesSubject;
  }

  observePersist(): Observable<Document<T>> {
    return this.persistSubject;
  }

  observeStatistics(): Observable<DocumentStatistics> {
    const encoder = new TextEncoder();

    return concat(of(this.getData()), this.changesSubject).pipe(
      map(() => {
        const documentSizeInBytes = this.store().length;
        const content = JSON.stringify(this.getRoot().toJSON());
        const contentSizeInBytes = encoder.encode(content).length;

        return {
          documentSizeInBytes,
          contentSizeInBytes,
        };
      })
    );
  }

  clone(): YDocument<T> {
    const clone = new YDocument<T>(this.documentVersion, this.keepUndoRedoItem);
    Y.applyUpdate(clone.doc, Y.encodeStateAsUpdate(this.doc));
    return clone;
  }

  getUndoManager(): DocumentUndoManager {
    return this.undoManager;
  }

  private getRoot(): SharedMap<T> {
    return this.doc.getMap(this.documentVersion) as SharedMap<T>;
  }

  private applyAndNotifyChanges(callback: () => void) {
    const handler = (change: Uint8Array) => {
      this.changesSubject.next(this.getRoot());
      this.publishSubject.next(change);
      this.persistSubject.next(this);
    };

    try {
      this.doc.on('update', handler);
      callback();
    } finally {
      this.doc.off('update', handler);
    }
  }
}
