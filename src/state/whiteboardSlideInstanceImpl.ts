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

import { first, isEqual } from 'lodash';
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
import {
  CURSOR_UPDATE_MESSAGE,
  CommunicationChannel,
  CursorUpdate,
  isValidCursorUpdateMessage,
} from './communication';
import {
  Document,
  Element,
  Point,
  UpdateElementPatch,
  WhiteboardDocument,
  generateAddElement,
  generateAddElements,
  generateLockSlide,
  generateMoveDown,
  generateMoveToBottom,
  generateMoveToTop,
  generateMoveUp,
  generateRemoveElement,
  generateUnlockSlide,
  generateUpdateElement,
  getElement,
  getNormalizedElementIds,
  getSlideLock,
} from './crdt';
import { generate } from './crdt/documents/operations';
import {
  Elements,
  WhiteboardSlideInstance,
  WhiteboardUndoManagerContext,
} from './types';

export class WhiteboardSlideInstanceImpl implements WhiteboardSlideInstance {
  private readonly destroySubject = new Subject<void>();

  private readonly activeElementIdsSubject = new Subject<string[]>();
  private activeElementIds: string[] = [];

  private readonly dataObservable = concat(
    defer(() => of(this.document.getData())),
    this.document.observeChanges(),
  ).pipe(takeUntil(this.destroySubject));
  private readonly elementIdsObservable = this.dataObservable.pipe(
    map((doc) => getNormalizedElementIds(doc, this.slideId)),
    distinctUntilChanged(isEqual),
  );
  private readonly cursorPositionSubject = new Subject<Point>();
  private readonly cursorPositionObservable: Observable<Record<string, Point>> =
    combineLatest([
      this.communicationChannel.observeMessages().pipe(
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

  constructor(
    private readonly communicationChannel: CommunicationChannel,
    private readonly slideId: string,
    private readonly document: Document<WhiteboardDocument>,
    private readonly userId: string,
  ) {
    this.observeElementIds()
      .pipe(takeUntil(this.destroySubject))
      .subscribe(() => {
        this.activeElementIdsSubject.next(this.getActiveElementIds());
      });

    this.cursorPositionSubject
      .pipe(
        takeUntil(this.destroySubject),
        throttleTime(100, undefined, { leading: true, trailing: true }),
      )
      .subscribe((position) => {
        this.communicationChannel.broadcastMessage<CursorUpdate>(
          CURSOR_UPDATE_MESSAGE,
          {
            slideId: this.slideId,
            position,
          },
        );
      });
  }

  lockSlide() {
    this.document.performChange(generateLockSlide(this.slideId, this.userId));
  }

  unlockSlide() {
    this.document.performChange(generateUnlockSlide(this.slideId));
  }

  addElement(element: Element): string {
    this.assertLocked();

    const [changeFn, elementId] = generateAddElement(this.slideId, element);

    // set the active element ID first, so it is captured in the undomanager
    this.setActiveElementId(elementId);

    this.document.performChange(changeFn);

    return elementId;
  }

  addElements(elements: Array<Element>): string[] {
    this.assertLocked();

    const [changeFn, elementIds] = generateAddElements(this.slideId, elements);

    // set the active element IDs first, so it is captured in the undomanager
    this.setActiveElementIds(elementIds);

    this.document.performChange(changeFn);

    return elementIds;
  }

  removeElement(elementId: string): void {
    this.assertLocked();

    this.document.performChange(generateRemoveElement(this.slideId, elementId));
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

  moveElementToBottom(elementId: string): void {
    this.assertLocked();

    this.document.performChange(generateMoveToBottom(this.slideId, elementId));
  }

  moveElementDown(elementId: string): void {
    this.assertLocked();

    this.document.performChange(generateMoveDown(this.slideId, elementId));
  }

  moveElementUp(elementId: string): void {
    this.assertLocked();

    this.document.performChange(generateMoveUp(this.slideId, elementId));
  }

  moveElementToTop(elementId: string): void {
    this.assertLocked();

    this.document.performChange(generateMoveToTop(this.slideId, elementId));
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

  getElementIds(): string[] {
    return getNormalizedElementIds(this.document.getData(), this.slideId);
  }

  observeElementIds(): Observable<string[]> {
    return this.elementIdsObservable;
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
