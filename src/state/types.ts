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

import { StateEvent } from '@matrix-widget-toolkit/api';
import { Observable } from 'rxjs';
import { Whiteboard } from '../model';
import { CommunicationChannelStatistics } from './communication';
import {
  Document,
  DocumentStatistics,
  Element,
  Point,
  UpdateElementPatch,
} from './crdt';
import { WhiteboardDocumentExport } from './export';

/** Creates and holds the currently selected {@link WhiteboardInstance} based on a whiteboard state event */
export type WhiteboardManager = {
  /** Create an instance of the whiteboard */
  selectActiveWhiteboardInstance(whiteboardEvent: StateEvent<Whiteboard>): void;
  /** Get the active whiteboard instance */
  getActiveWhiteboardInstance(): WhiteboardInstance | undefined;
};

export type DocumentSyncStatistics = DocumentStatistics & {
  snapshotsSend: number;
  snapshotsReceived: number;
  snapshotOutstanding: boolean;
};

export type WhiteboardStatistics = {
  document?: DocumentSyncStatistics;
  communicationChannel: CommunicationChannelStatistics;
};

/** An instance of a whiteboard that can be used to read and manipulate it. */
export type WhiteboardInstance = {
  /** Returns the id of the whiteboard. */
  getWhiteboardId(): string;
  /**
   * Add a new slide at the end of the whiteboard.
   * @returns the id of the created slide.
   */
  addSlide(): string;
  /** Move the slide to another positions. */
  moveSlide(slideId: string, index: number): void;
  /** Remove the slide. */
  removeSlide(slideId: string): void;
  /** Focus every peers view on a specific slide. */
  focusOn(slideId: string): void;
  /**
   * Returns the slide instance for a slide.
   * @throws if the slide does not exist
   */
  getSlide(slideId: string): WhiteboardSlideInstance;
  /** Returns the list of all slide ids in the correct order. */
  getSlideIds(): string[];
  /** Observe the slide ids to react to changes. */
  observeSlideIds(): Observable<string[]>;
  /** Returns the whiteboard statistics. */
  getWhiteboardStatistics(): WhiteboardStatistics;
  /** Observe the whiteboard statistics to react to changes. */
  observeWhiteboardStatistics(): Observable<WhiteboardStatistics>;

  /** Return the active slide */
  getActiveSlideId(): string | undefined;
  /** Observe the active slide */
  observeActiveSlideId(): Observable<string | undefined>;
  /** Select the active slide */
  setActiveSlideId(slideId: string): void;

  /**
   * Get the whiteboard loading state, true as the whiteboard is loading data
   * and is unusable.
   */
  isLoading(): boolean;
  /**
   * Observe the whiteboard loading state, true as the whiteboard is loading
   * data and is unusable.
   */
  observeIsLoading(): Observable<boolean>;

  /** Get the export file representation of the whiteboard. */
  export(): WhiteboardDocumentExport;
  /** Replace the whiteboard contents with the contents of the export file. */
  import(whiteboardDocumentExport: WhiteboardDocumentExport): void;

  /** Undo the latest change in the whiteboard. */
  undo(): void;
  /** Redo the last undo'ed change in the whiteboard. */
  redo(): void;
  /** Observe whether an undo or redo operation is possible. */
  observeUndoRedoState(): Observable<{ canUndo: boolean; canRedo: boolean }>;

  /** Get access to the presentation manager */
  getPresentationManager(): PresentationManager;

  /** Clear the undo manager */
  clearUndoManager(): void;
};

/** An instance of a whiteboard slide that can be used to read and manipulate it. */
export type WhiteboardSlideInstance = {
  /** Lock the slide to disable all edit operations in the UI. */
  lockSlide(): void;
  /** Unlock the slide. */
  unlockSlide(): void;
  /**
   * Add a new element to the slide.
   * @param element - the specification of the element.
   * @returns the id of the created element.
   */
  addElement(element: Element): string;
  /** Remove the element */
  removeElement(elementId: string): void;
  /**
   * Update the element properties.
   * @param patch - the properties to add/override in the element.
   */
  updateElement(elementId: string, patch: UpdateElementPatch): void;
  /** Move the element to the bottom of the slide. */
  moveElementToBottom(elementId: string): void;
  /** Move the element one level down. */
  moveElementDown(elementId: string): void;
  /** Move the element one level up. */
  moveElementUp(elementId: string): void;
  /** Move the element to the top of the slide. */
  moveElementToTop(elementId: string): void;
  /** Returns the element or undefined if it not exists. */
  getElement(elementId: string): Element | undefined;
  /** Observe the changes of an element. Emits undefined if the element is removed. */
  observeElement(elementId: string): Observable<Element | undefined>;
  /** Returns the list of all element ids in the correct order from back to front. */
  getElementIds(): string[];
  /** Observe the element ids to react to changes */
  observeElementIds(): Observable<string[]>;
  /** Returns the cursors for each connected user. */
  observeCursorPositions(): Observable<Record<string, Point>>;
  /** Broadcast the position of the own user in to all other connected users. */
  publishCursorPosition(position: Point): void;
  /** Return if the slide is locked */
  isLocked(): boolean;
  /** Observe the locked state of the slide */
  observeIsLocked(): Observable<boolean>;

  /** Return the active element */
  getActiveElementId(): string | undefined;
  /** Observe the active element */
  observeActiveElementId(): Observable<string | undefined>;
  /** Select the active element */
  setActiveElementId(elementId: string | undefined): void;
};

/**
 * A document that is stored in a persistent storage and is kept up-to-date via
 * a real-time communication channel.
 */
export type SynchronizedDocument<T extends Record<string, unknown>> = {
  /** Get the document that is managed by this instance */
  getDocument(): Document<T>;
  /** Observe the statistics of the document. */
  observeDocumentStatistics(): Observable<DocumentSyncStatistics>;
  /** Observe the loading state of the document. */
  observeIsLoading(): Observable<boolean>;
  /** Destroy the document to cleanup all open connections. */
  destroy(): void;
};

export type PresentationState =
  | { type: 'idle' }
  | { type: 'presenting'; isEditMode: boolean }
  | { type: 'presentation'; presenterUserId: string; isEditMode: boolean };

/** Creates and holds the currently selected {@link WhiteboardInstance} based on a whiteboard state event */
export type PresentationManager = {
  /** Start the presentation and let all other users follow me. */
  startPresentation(): void;
  /** Start the presentation and let all other users follow me. */
  stopPresentation(): void;
  /** Observe whether a presentation is active. */
  observePresentationState(): Observable<PresentationState>;
  /** Toggle the edit mode for all other users. */
  toggleEditMode(): void;
};

/** The data that is stored in the UndoManager */
export type WhiteboardUndoManagerContext = {
  currentSlideId: string;
  currentElementId?: string;
};

/** Validate if the value that was stored in the context is valid */
export function isWhiteboardUndoManagerContext(
  context: unknown
): context is WhiteboardUndoManagerContext {
  if (
    context &&
    typeof context === 'object' &&
    'currentSlideId' in context &&
    typeof context.currentSlideId === 'string' &&
    (!('currentElementId' in context) ||
      context.currentElementId === undefined ||
      typeof context.currentElementId === 'string')
  ) {
    return true;
  }

  return false;
}
