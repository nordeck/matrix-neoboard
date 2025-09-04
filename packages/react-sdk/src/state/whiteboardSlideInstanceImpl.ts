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

import { nanoid } from '@reduxjs/toolkit';
import { first, isEqual, uniq } from 'lodash';
import {
  Observable,
  Subject,
  combineLatest,
  concat,
  defer,
  distinctUntilChanged,
  filter,
  map,
  of,
  scan,
  takeUntil,
  throttleTime,
  timer,
} from 'rxjs';
import { isDefined } from '../lib';
import {
  CURSOR_UPDATE_MESSAGE,
  CommunicationChannel,
  CursorUpdate,
  Message,
  isValidCursorUpdateMessage,
} from './communication';
import {
  Document,
  Element,
  FrameElement,
  PathElement,
  Point,
  ShapeElement,
  UpdateElementPatch,
  WhiteboardDocument,
  generateAddElement,
  generateAddElements,
  generateLockSlide,
  generateMoveDown,
  generateMoveElements,
  generateMoveUp,
  generateUnlockSlide,
  generateUpdateElement,
  getElement,
  getNormalizedElementIds,
  getSlideLock,
} from './crdt';
import { generate, generateRemoveElements } from './crdt/documents/operations';
import {
  ElementUpdate,
  Elements,
  WhiteboardSlideInstance,
  WhiteboardUndoManagerContext,
} from './types';
import {
  changeElementFrame,
  changeFrameElements,
  connectShapeElement,
  deleteRelations,
  disconnectPathElement,
  disconnectShapeElement,
  findConnectingPaths,
  findConnectingShapes,
  findElementDetachFrame,
  findNotSelectedAttachedElements,
  invertElementAttachFrame,
} from './utils';

export class WhiteboardSlideInstanceImpl implements WhiteboardSlideInstance {
  private readonly destroySubject = new Subject<void>();

  private readonly activeElementIdsSubject = new Subject<string[]>();
  private activeElementIds: string[] = [];
  private frameElements: Elements<FrameElement> = {};

  private readonly dataObservable = concat(
    defer(() => of(this.document.getData())),
    this.document.observeChanges(),
  ).pipe(takeUntil(this.destroySubject));
  private readonly elementIdsObservable = this.dataObservable.pipe(
    map((doc) => getNormalizedElementIds(doc, this.slideId)),
    distinctUntilChanged(isEqual),
  );
  private readonly frameElementsObservable = this.dataObservable.pipe(
    map((doc) => {
      const frameElements: Elements<FrameElement> = {};
      for (const elementId of getNormalizedElementIds(doc, this.slideId)) {
        const element = getElement(doc, this.slideId, elementId)?.toJSON();
        if (element && element.type === 'frame') {
          frameElements[elementId] = element;
        }
      }
      return frameElements;
    }),
    distinctUntilChanged(isEqual),
  );

  private readonly cursorPositionSubject = new Subject<Point>();
  private readonly cursorPositionObservable: Observable<Record<string, Point>> =
    combineLatest([
      (
        this.communicationChannel?.observeMessages() ?? new Subject<Message>()
      ).pipe(
        filter(isValidCursorUpdateMessage),
        filter((m) => m.content.slideId === this.slideId),
        scan(
          (acc, m) => {
            return {
              ...acc,
              [m.senderUserId]: {
                position: m.content.position as Point,
                timestamp: Date.now(),
              },
            };
          },
          {} as Record<string, { position: Point; timestamp: number }>,
        ),
      ),
      timer(0, 1000),
    ]).pipe(
      map(([data]) =>
        Object.fromEntries<Point>(
          Object.entries(data)
            .filter(([_key, value]) => value.timestamp + 5000 > Date.now())
            .map(([key, value]) => [key, value.position]),
        ),
      ),
      distinctUntilChanged(isEqual),
      takeUntil(this.destroySubject),
    );
  private cursorPosition: Point | undefined;

  constructor(
    private readonly communicationChannel: CommunicationChannel | undefined,
    private readonly slideId: string,
    private readonly document: Document<WhiteboardDocument>,
    private readonly userId: string,
  ) {
    this.observeElementIds()
      .pipe(takeUntil(this.destroySubject))
      .subscribe(() => {
        this.activeElementIdsSubject.next(this.getActiveElementIds());
      });
    this.observeFrameElements()
      .pipe(takeUntil(this.destroySubject))
      .subscribe((value) => {
        this.frameElements = value;
      });

    if (this.communicationChannel) {
      this.cursorPositionSubject
        .pipe(
          takeUntil(this.destroySubject),
          throttleTime(100, undefined, { leading: true, trailing: true }),
        )
        .subscribe((position) => {
          this.communicationChannel?.broadcastMessage<CursorUpdate>(
            CURSOR_UPDATE_MESSAGE,
            {
              slideId: this.slideId,
              position,
            },
          );
        });
    }
  }

  lockSlide() {
    this.document.performChange(generateLockSlide(this.slideId, this.userId));
  }

  unlockSlide() {
    this.document.performChange(generateUnlockSlide(this.slideId));
  }

  addElement(element: Element): string {
    this.assertLocked();

    const newElement = deleteRelations(element);
    const [changeFn, elementId] = generateAddElement(this.slideId, newElement);

    // set the active element ID first, so it is captured in the undomanager
    this.setActiveElementId(elementId);

    this.document.performChange(changeFn);

    return elementId;
  }

  addShapeElementAndAttach(element: ShapeElement): string {
    this.assertLocked();

    const { attachedFrame } = element;

    let attachFrameElement: [string, FrameElement] | undefined;
    if (attachedFrame) {
      const frameElement = this.getElement(attachedFrame);
      if (frameElement && frameElement.type === 'frame') {
        attachFrameElement = [attachedFrame, frameElement];
      }
    }

    const newElement: Element = {
      ...element,
      attachedFrame: attachFrameElement ? attachFrameElement[0] : undefined,
    };

    const [addElement, elementId] = generateAddElement(
      this.slideId,
      newElement,
    );

    const updates: ElementUpdate[] = [];
    if (attachFrameElement) {
      const [frameElementId, frameElement] = attachFrameElement;
      const patch = changeFrameElements(frameElement, {
        attachElementIds: [elementId],
        detachElementIds: [],
      });
      if (patch) {
        updates.push({
          elementId: frameElementId,
          patch: patch,
        });
      }
    }

    // set the active element ID first, so it is captured in the undomanager
    this.setActiveElementId(elementId);

    this.document.performChange(
      generate([
        addElement,
        ...updates.map(({ elementId, patch }) =>
          generateUpdateElement(this.slideId, elementId, patch),
        ),
      ]),
    );

    return elementId;
  }

  addPathElementAndRelate(element: PathElement): string {
    this.assertLocked();

    const { connectedElementStart, connectedElementEnd, attachedFrame } =
      element;

    let startElement: [string, ShapeElement] | undefined;
    if (connectedElementStart) {
      const connectedElement = this.getElement(connectedElementStart);
      if (connectedElement && connectedElement.type === 'shape') {
        startElement = [connectedElementStart, connectedElement];
      }
    }
    let endElement: [string, ShapeElement] | undefined;
    if (connectedElementEnd) {
      const connectedElement = this.getElement(connectedElementEnd);
      if (connectedElement && connectedElement.type === 'shape') {
        endElement = [connectedElementEnd, connectedElement];
      }
    }
    let attachFrameElement: [string, FrameElement] | undefined;
    if (attachedFrame) {
      const frameElement = this.getElement(attachedFrame);
      if (frameElement && frameElement.type === 'frame') {
        attachFrameElement = [attachedFrame, frameElement];
      }
    }

    const newElement: Element = {
      ...element,
      connectedElementStart: startElement ? startElement[0] : undefined,
      connectedElementEnd: endElement ? endElement[0] : undefined,
      attachedFrame: attachFrameElement ? attachFrameElement[0] : undefined,
    };

    const [addElement, elementId] = generateAddElement(
      this.slideId,
      newElement,
    );

    const updates: ElementUpdate[] = [];
    if (startElement) {
      const [startElementId, shapeElement] = startElement;
      updates.push({
        elementId: startElementId,
        patch: connectShapeElement(shapeElement, elementId),
      });
    }
    if (endElement) {
      const [endElementId, shapeElement] = endElement;
      updates.push({
        elementId: endElementId,
        patch: connectShapeElement(shapeElement, elementId),
      });
    }
    if (attachFrameElement) {
      const [frameElementId, frameElement] = attachFrameElement;
      const patch = changeFrameElements(frameElement, {
        attachElementIds: [elementId],
        detachElementIds: [],
      });
      if (patch) {
        updates.push({
          elementId: frameElementId,
          patch: patch,
        });
      }
    }

    // set the active element ID first, so it is captured in the undomanager
    this.setActiveElementId(elementId);

    this.document.performChange(
      generate([
        addElement,
        ...updates.map(({ elementId, patch }) =>
          generateUpdateElement(this.slideId, elementId, patch),
        ),
      ]),
    );

    return elementId;
  }

  addElements(elements: Array<Element>): string[] {
    this.assertLocked();

    const newElements = elements.map((e) => deleteRelations(e));
    const [changeFn, elementIds] = generateAddElements(
      this.slideId,
      newElements,
    );

    // set the active element IDs first, so it is captured in the undomanager
    this.setActiveElementIds(elementIds);

    this.document.performChange(changeFn);

    return elementIds;
  }

  addElementsWithRelations(elements: Elements): string[] {
    this.assertLocked();

    // Generate new id for each element
    const newElementIdsMap = new Map<string, string>();
    for (const elementId of Object.keys(elements)) {
      newElementIdsMap.set(elementId, nanoid());
    }

    /**
     * Modify elements with new ids.
     * Update element ids in relations.
     * Remove relations to unknown elements.
     * */
    const newElements: Elements = {};
    const updates: ElementUpdate[] = [];
    for (const [elementId, element] of Object.entries(elements)) {
      let newElement: Element;
      if (element.type === 'shape') {
        const { connectedPaths } = element;

        let newConnectedPaths: string[] | undefined;
        if (connectedPaths) {
          newConnectedPaths = connectedPaths
            .map((connectedElementId) =>
              newElementIdsMap.get(connectedElementId),
            )
            .filter(isDefined);
          newConnectedPaths =
            newConnectedPaths.length == 0 ? undefined : newConnectedPaths;
        }
        newElement = {
          ...element,
          connectedPaths: newConnectedPaths,
        };
      } else if (element.type === 'path') {
        const { connectedElementStart, connectedElementEnd } = element;

        newElement = {
          ...element,
          connectedElementStart: connectedElementStart
            ? newElementIdsMap.get(connectedElementStart)
            : undefined,
          connectedElementEnd: connectedElementEnd
            ? newElementIdsMap.get(connectedElementEnd)
            : undefined,
        };
      } else {
        newElement = element;
      }

      if (newElement.type === 'frame') {
        const { attachedElements } = newElement;

        let newAttachedElements: string[] | undefined;
        if (attachedElements) {
          newAttachedElements = attachedElements
            .map((elementId) => newElementIdsMap.get(elementId))
            .filter(isDefined);
          newAttachedElements =
            newAttachedElements.length === 0 ? undefined : newAttachedElements;
        }
        newElement = {
          ...newElement,
          attachedElements: newAttachedElements,
        };
      } else {
        const { attachedFrame } = newElement;
        let newAttachedFrame: string | undefined;
        if (attachedFrame) {
          const documentElement = this.getElement(attachedFrame);
          const newElementId = newElementIdsMap.get(elementId);
          if (
            !newElementIdsMap.has(attachedFrame) && // check that we don't reference one of the passed elements
            documentElement !== undefined &&
            documentElement.type === 'frame' &&
            newElementId
          ) {
            // allow to reference an existing frame
            newAttachedFrame = attachedFrame;

            // Update the frame
            const patch = changeFrameElements(documentElement, {
              attachElementIds: [newElementId],
              detachElementIds: [],
            });
            if (patch) {
              updates.push({
                elementId: attachedFrame,
                patch: patch,
              });
            }
          } else if (elements[attachedFrame]?.type === 'frame') {
            // allow to reference a frame for elements, take new id
            newAttachedFrame = newElementIdsMap.get(attachedFrame);
          }
        }
        newElement = {
          ...newElement,
          attachedFrame: newAttachedFrame,
        };
      }

      const newElementId = newElementIdsMap.get(elementId);
      if (!newElementId) {
        throw new Error('New element id must be defined');
      }

      newElements[newElementId] = newElement;
    }

    const [addElementsChangeFn, elementIds] = generateAddElements(
      this.slideId,
      Object.values(newElements),
      Object.keys(newElements),
    );

    // set the active element IDs first, so it is captured in the undo manager
    this.setActiveElementIds(elementIds);

    this.document.performChange(
      generate([
        addElementsChangeFn,
        ...updates.map(({ elementId, patch }) =>
          generateUpdateElement(this.slideId, elementId, patch),
        ),
      ]),
    );

    return elementIds;
  }

  removeElements(elementIds: string[]): void {
    this.assertLocked();

    const updates: {
      elementId: string;
      patch: UpdateElementPatch;
    }[] = [];

    const elements: Elements = this.getElements(elementIds);

    const connectedElementIds = [
      ...findConnectingPaths(elements),
      ...findConnectingShapes(elements),
    ];

    const detachElementIds = findNotSelectedAttachedElements(elements);
    const elementDetachFrame = findElementDetachFrame(elements);
    const frameDetachElements = invertElementAttachFrame(elementDetachFrame);

    const changeElementIds = [
      ...detachElementIds,
      ...Object.keys(frameDetachElements),
    ];

    const changeElementIdsAll = uniq([
      ...connectedElementIds,
      ...changeElementIds,
    ]);

    for (const elementId of changeElementIdsAll) {
      const element = this.getElement(elementId);

      if (!element) {
        continue;
      }

      const { type: elementType } = element;

      let connectPatch: UpdateElementPatch | undefined;
      if (connectedElementIds.includes(elementId)) {
        if (elementType === 'path') {
          connectPatch = disconnectPathElement(element, elementIds);
        } else if (elementType === 'shape') {
          connectPatch = disconnectShapeElement(element, elementIds, true);
        }
      }

      let attachPatch: UpdateElementPatch | undefined;
      if (changeElementIds.includes(elementId)) {
        if (elementType === 'frame') {
          const detachElementIds = frameDetachElements[elementId];
          if (detachElementIds) {
            attachPatch = changeFrameElements(element, {
              attachElementIds: [],
              detachElementIds,
            });
          }
        } else {
          attachPatch = changeElementFrame(element, undefined);
        }
      }

      if (connectPatch || attachPatch) {
        updates.push({
          elementId,
          patch: {
            ...connectPatch,
            ...attachPatch,
          },
        });
      }
    }

    this.document.performChange(
      generate([
        ...updates.map(({ elementId, patch }) =>
          generateUpdateElement(this.slideId, elementId, patch),
        ),
        generateRemoveElements(this.slideId, elementIds),
      ]),
    );
  }

  updateElement(elementId: string, patch: UpdateElementPatch): void {
    this.assertLocked();

    this.document.performChange(
      generateUpdateElement(this.slideId, elementId, patch),
    );
  }

  updateElements(
    updates: {
      elementId: string;
      patch: UpdateElementPatch;
    }[],
  ): void {
    this.assertLocked();

    this.document.performChange(
      generate(
        updates.map(({ elementId, patch }) =>
          generateUpdateElement(this.slideId, elementId, patch),
        ),
      ),
    );
  }

  moveElementDown(elementId: string): void {
    this.assertLocked();

    this.document.performChange(generateMoveDown(this.slideId, elementId));
  }

  moveElementsToBottom(elementIds: string[]): void {
    this.assertLocked();

    const elementIdsSorted = this.sortElementIds(elementIds).reverse();
    this.document.performChange(
      generateMoveElements(this.slideId, elementIdsSorted, 'bottom'),
    );
  }

  moveElementUp(elementId: string): void {
    this.assertLocked();

    this.document.performChange(generateMoveUp(this.slideId, elementId));
  }

  moveElementsToTop(elementIds: string[]): void {
    this.assertLocked();

    const elementIdsSorted = this.sortElementIds(elementIds);
    this.document.performChange(
      generateMoveElements(this.slideId, elementIdsSorted, 'top'),
    );
  }

  getElement(elementId: string): Element | undefined {
    return getElement(
      this.document.getData(),
      this.slideId,
      elementId,
    )?.toJSON();
  }

  getElements(elementIds: string[]): Elements {
    const elements: Elements = {};
    for (const elementId of elementIds) {
      const element = this.getElement(elementId);
      if (element) {
        elements[elementId] = element;
      }
    }
    return elements;
  }

  getFrameElements(): Elements<FrameElement> {
    return this.frameElements;
  }

  observeElement(elementId: string): Observable<Element | undefined> {
    return this.dataObservable.pipe(
      map((doc) => getElement(doc, this.slideId, elementId)?.toJSON()),
      distinctUntilChanged(isEqual),
    );
  }

  observeElements(elementIds: string[]): Observable<Elements> {
    return this.dataObservable.pipe(
      map((doc) => {
        const elements: Elements = {};
        for (const elementId of elementIds) {
          const element = getElement(doc, this.slideId, elementId)?.toJSON();
          if (element) {
            elements[elementId] = element;
          }
        }
        return elements;
      }),
      distinctUntilChanged(isEqual),
    );
  }

  observeFrameElements(): Observable<Elements<FrameElement>> {
    return this.frameElementsObservable;
  }

  getElementIds(): string[] {
    return getNormalizedElementIds(this.document.getData(), this.slideId);
  }

  observeElementIds(): Observable<string[]> {
    return this.elementIdsObservable;
  }

  setCursorPosition(position: Point | undefined) {
    this.cursorPosition = position;
  }

  getCursorPosition(): Point | undefined {
    return this.cursorPosition;
  }

  observeCursorPositions(): Observable<Record<string, Point>> {
    return this.cursorPositionObservable;
  }

  publishCursorPosition(position: Point) {
    this.cursorPositionSubject.next(position);
  }

  getActiveElementId(): string | undefined {
    const activeElementId = first(this.activeElementIds);
    return activeElementId && this.getElementIds().includes(activeElementId)
      ? activeElementId
      : undefined;
  }

  getActiveElementIds(): string[] {
    return this.activeElementIds.filter((activeElementId) =>
      this.getElementIds().includes(activeElementId),
    );
  }

  observeActiveElementId(): Observable<string | undefined> {
    return this.observeActiveElementIds().pipe(
      map((elements) => first(elements)),
    );
  }

  observeActiveElementIds(): Observable<string[]> {
    return concat(
      defer(() => of(this.getActiveElementIds())),
      this.activeElementIdsSubject,
    ).pipe(distinctUntilChanged(isEqual));
  }

  setActiveElementId(elementId: string | undefined): void {
    this.activeElementIds = elementId ? [elementId] : [];
    this.activeElementIdsSubject.next(this.getActiveElementIds());

    this.updateDocumentUndoManagerCurrentElement(
      elementId ? [elementId] : undefined,
    );
  }

  setActiveElementIds(elementIds: string[] | undefined): void {
    this.activeElementIds = elementIds ?? [];
    this.activeElementIdsSubject.next(this.getActiveElementIds());

    this.updateDocumentUndoManagerCurrentElement(elementIds);
  }

  addActiveElementId(elementId: string): void {
    if (
      this.getElementIds().includes(elementId) &&
      !this.activeElementIds.includes(elementId)
    ) {
      this.activeElementIds = [
        ...this.activeElementIds.filter((activeElementId) =>
          this.getElementIds().includes(activeElementId),
        ),
        elementId,
      ];
      this.activeElementIdsSubject.next(this.activeElementIds);

      this.updateDocumentUndoManagerCurrentElement(this.activeElementIds);
    }
  }

  unselectActiveElementId(elementId: string): void {
    const activeElementIds = this.activeElementIds.filter(
      (activeElementId) => activeElementId !== elementId,
    );
    this.activeElementIds = activeElementIds;
    this.activeElementIdsSubject.next(activeElementIds);

    this.updateDocumentUndoManagerCurrentElement(this.activeElementIds);
  }

  sortElementIds(elementIds: string[]): string[] {
    const ids = this.getElementIds();

    return elementIds
      .filter((elementId) => ids.includes(elementId))
      .sort((a, b) => ids.indexOf(a) - ids.indexOf(b));
  }

  private updateDocumentUndoManagerCurrentElement(
    elementIds: string[] | undefined,
  ): void {
    this.document.getUndoManager().setContext<WhiteboardUndoManagerContext>({
      currentSlideId: this.slideId,
      currentElementIds: elementIds,
    });
  }

  isLocked(): boolean {
    return getSlideLock(this.document.getData(), this.slideId) !== undefined;
  }

  observeIsLocked(): Observable<boolean> {
    return this.dataObservable.pipe(
      map((doc) => getSlideLock(doc, this.slideId) !== undefined),
      distinctUntilChanged(),
    );
  }

  destroy() {
    this.destroySubject.next();
    this.activeElementIdsSubject.complete();
    this.cursorPositionSubject.complete();
  }

  private assertLocked(): void {
    if (this.isLocked()) {
      throw new Error('Can not modify slide, slide is locked.');
    }
  }
}
