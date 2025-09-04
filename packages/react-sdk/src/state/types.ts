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

import { StateEvent, WidgetApi } from '@matrix-widget-toolkit/api';
import { BehaviorSubject, Observable } from 'rxjs';
import { Whiteboard } from '../model';
import { CommunicationChannelStatistics } from './communication';
import {
  Document,
  DocumentStatistics,
  Element,
  FrameElement,
  PathElement,
  Point,
  ShapeElement,
  UpdateElementPatch,
} from './crdt';
import { WhiteboardDocumentExport } from './export';

/** Creates and holds the currently selected {@link WhiteboardInstance} based on a whiteboard state event */
export type WhiteboardManager = {
  /** Create an instance of the whiteboard */
  selectActiveWhiteboardInstance(
    whiteboardEvent: StateEvent<Whiteboard>,
    userId: string,
  ): void;
  /** Get the active whiteboard instance */
  getActiveWhiteboardInstance(): WhiteboardInstance | undefined;
  /** Get an observable subject for the active whiteboard */
  getActiveWhiteboardSubject(): ObservableBehaviorSubject<
    WhiteboardInstance | undefined
  >;
  /** Clean up the current whiteboard. */
  clear(): void;
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
   * Add a new slide to the whiteboard.
   *
   * @param index - If provided, add the slide at the index.
   *                Else add the slide to the end.
   * @returns the id of the created slide.
   */
  addSlide(index?: number): string;
  /**
   * Creates a copy of the selected slide directly after it.
   * @throws if the slide does not exist
   * @returns the ID of the created slide.
   */
  duplicateSlide(slideId: string): string;
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

  /**
   * Get the export file representation of the whiteboard.
   *
   * @param baseUrl - Homeserver base URL used to download images
   * @returns exported document
   */
  export(widgetApi: WidgetApi): Promise<WhiteboardDocumentExport>;
  /**
   * Replace the whiteboard contents with the contents of the export file.
   *
   * @param atSlideIndex - If set, the contents will be inserted instead of replacing previous slides.
   */
  import(
    whiteboardDocumentExport: WhiteboardDocumentExport,
    atSlideIndex?: number,
  ): void;

  /** Undo the latest change in the whiteboard. */
  undo(): void;
  /** Redo the last undo'ed change in the whiteboard. */
  redo(): void;
  /** Observe whether an undo or redo operation is possible. */
  observeUndoRedoState(): Observable<{ canUndo: boolean; canRedo: boolean }>;

  /** Get access to the presentation manager */
  getPresentationManager(): PresentationManager | undefined;

  /** Clear the undo manager */
  clearUndoManager(): void;

  /**
   * Destroy the whiteboard. For example clear listeners.
   * The whiteboard should no longer be used after the call.
   */
  destroy(): void;

  /** Persist the whiteboard state. */
  persist(): Promise<void>;
};

export type ElementUpdate = {
  /** ID of the element to be updated */
  elementId: string;
  /** the properties to add/override in the element */
  patch: UpdateElementPatch;
};

/** An instance of a whiteboard slide that can be used to read and manipulate it. */
export type WhiteboardSlideInstance = {
  /** Lock the slide to disable all edit operations in the UI. */
  lockSlide(): void;
  /** Unlock the slide. */
  unlockSlide(): void;
  /**
   * Add a new element to the slide. All relations (connections, attachments) will be ignored.
   * @param element - the specification of the element.
   * @returns the ID of the created element.
   */
  addElement(element: Element): string;
  /**
   * Add a new shape element to the slide and attach the shape to a frame.
   * @param element - the shape to be added. It can contain an attachment relation to the frame.
   * @returns the ID of the created element.
   */
  addShapeElementAndAttach(element: ShapeElement): string;
  /**
   * Add a new path element to the slide and connect it to the shapes or attach it to the frame.
   * @param element - the path element to be added. It can contain a connection relation to the shapes or an attachment relation to the frame, or both.
   * @returns the ID of the created element.
   */
  addPathElementAndRelate(element: PathElement): string;
  /**
   * Add new elements to the slide. All relations (connections, attachments) will be ignored.
   * @param elements - the specification of the elements.
   * @returns the IDs of the created elements.
   */
  addElements(elements: Array<Element>): string[];
  /**
   * Add new elements with their relations.
   * Each element will be assigned a new id within the document.
   * The ids in the relations are updated to match these new ids.
   * Remove any id that correspond to unknown relations (connections, attachments).
   *
   * Connections for elements not included in the passed elements are ignored.
   * Attachments for elements can reference existing frames. These frames will be updated with attached elements.
   *
   * @param elements - elements with relations to be added
   * @returns the IDs of the created elements, in the same order as the keys of passed elements.
   */
  addElementsWithRelations(elements: Elements): string[];
  /** Remove the elements by their IDs */
  removeElements(elementIds: string[]): void;
  /**
   * Update the element properties.
   * @param patch - the properties to add/override in the element.
   */
  updateElement(elementId: string, patch: UpdateElementPatch): void;
  /**
   * Update properties of multiple elements.
   * @param updates - the properties to add/override for each element.
   */
  updateElements(updates: ElementUpdate[]): void;
  /** Move the element one level down. */
  moveElementDown(elementId: string): void;
  /** Move the elements to the bottom of the slide. Moved elements retain their order on the slide.*/
  moveElementsToBottom(elementIds: string[]): void;
  /** Move the element one level up. */
  moveElementUp(elementId: string): void;
  /** Move the elements to the top of the slide. Moved elements retain their order on the slide.*/
  moveElementsToTop(elementIds: string[]): void;
  /** Returns the element or undefined if it not exists. */
  getElement(elementId: string): Element | undefined;
  /** Returns elements by ids. */
  getElements(elementIds: string[]): Elements;
  /** Returns elements of type 'frame' */
  getFrameElements(): Elements<FrameElement>;
  /** Observe the changes of an element. Emits undefined if the element is removed. */
  observeElement(elementId: string): Observable<Element | undefined>;
  /** Observe the changes of elements.*/
  observeElements(elementIds: string[]): Observable<Elements>;
  /** Observe the changes in elements of type 'frame'.*/
  observeFrameElements(): Observable<Elements<FrameElement>>;
  /** Returns the list of all element ids in the correct order from back to front. */
  getElementIds(): string[];
  /** Observe the element ids to react to changes */
  observeElementIds(): Observable<string[]>;
  /** Set cursor position */
  setCursorPosition(position: Point | undefined): void;
  /** Get cursor position */
  getCursorPosition(): Point | undefined;
  /** Returns the cursors for each connected user. */
  observeCursorPositions(): Observable<Record<string, Point>>;
  /** Broadcast the position of the own user in to all other connected users. */
  publishCursorPosition(position: Point): void;
  /** Return if the slide is locked */
  isLocked(): boolean;
  /** Observe the locked state of the slide */
  observeIsLocked(): Observable<boolean>;

  /**
   * Return the active element
   * @deprecated to be replaced with getActiveElementIds
   * */
  getActiveElementId(): string | undefined;
  /** Return ids of the currently active elements in the order of their selection. */
  getActiveElementIds(): string[];
  /**
   * Observe the active element. First element is returned if multiple are active.
   * @deprecated to be replaced with observeActiveElementIds
   */
  observeActiveElementId(): Observable<string | undefined>;
  /** Observe the active elements */
  observeActiveElementIds(): Observable<string[]>;
  /** Select the active element */
  setActiveElementId(elementId: string | undefined): void;
  /** Select the active elements */
  setActiveElementIds(elementIds: string[] | undefined): void;
  /** Adds the element to active */
  addActiveElementId(elementId: string): void;
  /** Unselects the element if active */
  unselectActiveElementId(elementId: string): void;
  /**
   * Sort given element IDs based on the order of element IDs in the slide ignoring unknown ones.
   */
  sortElementIds(elementIds: string[]): string[];
};

export type Elements<T extends Element = Element> = Record<string, T>;

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
  /** Persist the document immediately. */
  persist(): Promise<void>;
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
  currentElementIds?: string[];
};

/** Validate if the value that was stored in the context is valid */
export function isWhiteboardUndoManagerContext(
  context: unknown,
): context is WhiteboardUndoManagerContext {
  if (
    context &&
    typeof context === 'object' &&
    'currentSlideId' in context &&
    typeof context.currentSlideId === 'string' &&
    (!('currentElementIds' in context) ||
      context.currentElementIds === undefined ||
      (Array.isArray(context.currentElementIds) &&
        context.currentElementIds.every((v) => typeof v === 'string')))
  ) {
    return true;
  }

  return false;
}

/**
 * BehaviorSubject type that only exposes functions for subscribers.
 */
export type ObservableBehaviorSubject<T> = Pick<
  BehaviorSubject<T>,
  'subscribe' | 'getValue' | 'pipe'
>;
