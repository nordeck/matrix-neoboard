/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { Observable } from 'rxjs';
import { SharedMap } from './y';

/** A callback for modifying a document. */
export type ChangeFn<T extends Record<string, unknown>> = (
  doc: SharedMap<T>
) => void;

/** Statistics of a document. */
export type DocumentStatistics = {
  /** Size of the CRDT document in its binary presentation in bytes. */
  documentSizeInBytes: number;
  /** Size of the content in bytes (after encoding to JSON). */
  contentSizeInBytes: number;
};

/** Validate the content of the document */
export type DocumentValidator<T extends Record<string, unknown>> = (
  document: Document<Record<string, unknown>>
) => document is Document<T>;

/** A Conflict-free Replicated Data Type (CRDT). */
export type Document<T extends Record<string, unknown>> = {
  /**
   * Apply a single change received from a remote if the resulting document
   * is valid.
   */
  applyChange(change: Uint8Array, isValid?: DocumentValidator<T>): void;

  /** Sync all changes from a persistence storage. */
  mergeFrom(remoteData: Uint8Array): void;

  /** Perform a change on the document. */
  performChange(callback: ChangeFn<T>): void;

  /** Store the document for a persistence storage. */
  store(): Uint8Array;

  /** Access the data of the document. */
  getData(): SharedMap<T>;

  /**
   * Observable that is triggered for every change performed directly to the
   * document that needs to be published to other instances.
   */
  observePublish(): Observable<Uint8Array>;

  /** Observable that is triggered for every change to the document. */
  observeChanges(): Observable<SharedMap<T>>;

  /** Observable that is triggered after every modification to the document. */
  observePersist(): Observable<Document<T>>;

  /** Observable that is triggered whenever the document statistics change. */
  observeStatistics(): Observable<DocumentStatistics>;

  /** Create a copy of this document. */
  clone(): Document<T>;

  /** Return the {@link DocumentUndoManager} for this document. */
  getUndoManager(): DocumentUndoManager;
};

/** An undo manager for a {@link Document} */
export type DocumentUndoManager = {
  /** Undo the latest change in the linked document. */
  undo(): void;

  /** Redo the last undo'ed change in the linked document. */
  redo(): void;

  /** Observe whether an undo or redo operation is possible. */
  observeState(): Observable<{ canUndo: boolean; canRedo: boolean }>;

  /**
   * Set a context that should be appended to the next operation. The context
   * is emitted from {@link onPop} after an undo or redo operation so other
   * (e.g. UI) state can be restored to before the undo operation.
   */
  setContext<T>(context: T | undefined): void;

  /**
   * Observable that is triggered whenever an operation was redone/undone.
   */
  onPop(): Observable<unknown>;
  /**
   * Observable that is triggered whenever an operation was redone/undone.
   *
   * @param validation - a type guard filter and cast the emitted values
   */
  onPop<T = unknown>(
    validation: (context: unknown) => context is T
  ): Observable<T>;

  /**
   * Clear the undo manager.
   */
  clear(): void;
};
