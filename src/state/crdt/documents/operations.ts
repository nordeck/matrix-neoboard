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
import { uniq } from 'lodash';
import { ChangeFn } from '../types';
import { SharedMap, YArray, YMap } from '../y';
import { Element } from './elements';
import { Slide, SlideLock, WhiteboardDocument } from './whiteboardDocument';

export function getSlide(
  doc: SharedMap<WhiteboardDocument>,
  slideId: string
): SharedMap<Slide> | undefined {
  return doc.get('slides').get(slideId);
}

/** Get the ordered list of slides. */
export function getNormalizedSlideIds(
  doc: SharedMap<WhiteboardDocument>
): string[] {
  const slideIds = doc.get('slideIds').toArray();
  const slides = doc.get('slides');

  // We can get into conflicts if two users are moving the same slide at the
  // same time. As a result, we might have duplicate entries in the slide ids.
  // To solve this, we always use the first entry.
  // Another possible conflict is that we still have duplicates referencing
  // slides that don't exist anymore, therefore we check that the slide is
  // still there.
  return uniq(slideIds).filter((s) => slides.get(s));
}

/** Return the lock state of the slide. */
export function getSlideLock(
  doc: SharedMap<WhiteboardDocument>,
  slideId: string
): SlideLock | undefined {
  const slide = getSlide(doc, slideId);

  return slide?.get('lock');
}

/**
 * Add a new slide at the end of the list of slides and returns the new
 * slide id.
 */
export function generateAddSlide(): [ChangeFn<WhiteboardDocument>, string] {
  const slideId = nanoid();

  const changeFn = (doc: SharedMap<WhiteboardDocument>) => {
    cleanupSlideIds(doc);

    const slide = new YMap<unknown>() as SharedMap<Slide>;
    slide.set('elements', new YMap());
    slide.set('elementIds', new YArray());
    doc.get('slides').set(slideId, slide);
    doc.get('slideIds').push([slideId]);
  };

  return [changeFn, slideId];
}

/** Move a slide identified by its id to a different position */
export function generateMoveSlide(
  slideId: string,
  index: number
): ChangeFn<WhiteboardDocument> {
  return (doc) => {
    cleanupSlideIds(doc);

    // This is not optimal. We don't have a true move operation available,
    // instead we removing an entry and adding it again. One thing is good:
    // non of the operations ever get lost. The delete operation is executed,
    // and even if executed twice, only the one element is deleted. Adding is
    // also always done, however, this operation can not be deduplicated and
    // can happen multiple times if conflicting. Therefore we might end up
    // with a duplicate entry on conflicts. We have to make sure to handle
    // that later.
    // Best would be support for a move operation in Yjs directly.
    // See https://github.com/yjs/yjs/pull/357
    const slideIds = doc.get('slideIds');
    const currentIndex = slideIds.toArray().indexOf(slideId);

    if (currentIndex >= 0) {
      slideIds.delete(currentIndex, 1);
      slideIds.insert(index, [slideId]);
    }
  };
}

/** Soft delete a slide by slide id. */
export function generateRemoveSlide(
  slideId: string
): ChangeFn<WhiteboardDocument> {
  return (doc) => {
    doc.get('slides').delete(slideId);
    cleanupSlideIds(doc);
  };
}

/** Lock a slide to disable all edit operations in the UI. */
export function generateLockSlide(
  slideId: string,
  userId: string
): ChangeFn<WhiteboardDocument> {
  return (doc) => {
    const slide = getSlide(doc, slideId);

    if (!slide) {
      return;
    }

    slide.set('lock', { userId });
  };
}

/** Unlock a slide. */
export function generateUnlockSlide(
  slideId: string
): ChangeFn<WhiteboardDocument> {
  return (doc) => {
    const slide = getSlide(doc, slideId);

    if (!slide) {
      return;
    }

    slide.delete('lock');
  };
}

/**
 * Removes all duplicating or leftover slide ids that can happen due too
 * conflicts.
 **/
function cleanupSlideIds(doc: SharedMap<WhiteboardDocument>): void {
  const discoveredSlideIds = new Set();
  let i = 0;

  const slideIds = doc.get('slideIds');
  const slides = doc.get('slides');

  while (i < slideIds.length) {
    const slideId = slideIds.get(i);
    const isDuplicate = discoveredSlideIds.has(slideId);
    const isLeftover = !slides.has(slideId);

    if (isDuplicate || isLeftover) {
      slideIds.delete(i);
    } else {
      discoveredSlideIds.add(slideId);
      ++i;
    }
  }
}

/** Get data for a single element. */
export function getElement(
  doc: SharedMap<WhiteboardDocument>,
  slideId: string,
  elementId: string
): SharedMap<Element> | undefined {
  const slide = getSlide(doc, slideId);

  if (!slide) {
    return undefined;
  }

  return slide.get('elements').get(elementId);
}

/** Get the ordered list of elements, */
export function getNormalizedElementIds(
  doc: SharedMap<WhiteboardDocument>,
  slideId: string
): string[] {
  const slide = getSlide(doc, slideId);

  if (!slide) {
    return [];
  }

  const elementIds = slide.get('elementIds').toArray();
  const elements = slide.get('elements');
  // We can get into conflicts if two users are moving the same element at the
  // same time. As a result, we might have duplicate entries in the element ids.
  // To solve this, we always use the first entry.
  // Another possible conflict is that we still have duplicates referencing
  // elements that don't exist anymore, therefore we check that the element is
  // still there.
  return uniq(elementIds).filter((e) => elements.get(e));
}

/**
 * Add a new element at the end of the list of elements and returns the new
 * element id.
 */
export function generateAddElement(
  slideId: string,
  element: Element
): [ChangeFn<WhiteboardDocument>, string] {
  const elementId = nanoid();

  const changeFn = (doc: SharedMap<WhiteboardDocument>) => {
    const slide = getSlide(doc, slideId);

    if (!slide) {
      throw new Error(`Slide not found: ${slideId}`);
    }

    cleanupElementIds(slide);

    const elementMap = new YMap(Object.entries(element)) as SharedMap<Element>;

    slide.get('elements').set(elementId, elementMap);
    slide.get('elementIds').push([elementId]);
  };

  return [changeFn, elementId];
}

/** Move an element identified by its id to a different position */
export function generateMoveElement(
  slideId: string,
  elementId: string,
  index: number | ((elementIds: string[], currentIndex: number) => number)
): ChangeFn<WhiteboardDocument> {
  return (doc) => {
    const slide = getSlide(doc, slideId);

    if (!slide) {
      return;
    }

    cleanupElementIds(slide);

    const elementIds = slide.get('elementIds');

    // This is not optimal. We don't have a true move operation available,
    // instead we removing an entry and adding it again. One thing is good:
    // non of the operations ever get lost. The delete operation is executed,
    // and even if executed twice, only the one element is deleted. Adding is
    // also always done, however, this operation can not be deduplicated and
    // can happen multiple times if conflicting. Therefore we might end up
    // with a duplicate entry on conflicts. We have to make sure to handle
    // that later.
    // Best would be support for a move operation in Yjs directly.
    // See https://github.com/yjs/yjs/pull/357
    const currentIndex = elementIds.toArray().indexOf(elementId);

    if (currentIndex >= 0) {
      const nextIndex =
        typeof index === 'number'
          ? index
          : index(elementIds.toArray(), currentIndex);

      if (nextIndex >= 0) {
        elementIds.delete(currentIndex);
        elementIds.insert(nextIndex, [elementId]);
      }
    }
  };
}

/** Move the element to the bottom. */
export function generateMoveToBottom(
  slideId: string,
  elementId: string
): ChangeFn<WhiteboardDocument> {
  return generateMoveElement(slideId, elementId, 0);
}

/** Move the element to the top. */
export function generateMoveToTop(
  slideId: string,
  elementId: string
): ChangeFn<WhiteboardDocument> {
  return generateMoveElement(
    slideId,
    elementId,
    (elementIds) => elementIds.length - 1
  );
}

/** Move the element one step upwards to the top. */
export function generateMoveUp(
  slideId: string,
  elementId: string
): ChangeFn<WhiteboardDocument> {
  return generateMoveElement(
    slideId,
    elementId,
    (_, currentIndex) => currentIndex + 1
  );
}

/** Move the element one step downwards to the bottom. */
export function generateMoveDown(
  slideId: string,
  elementId: string
): ChangeFn<WhiteboardDocument> {
  return generateMoveElement(
    slideId,
    elementId,
    (_, currentIndex) => currentIndex - 1
  );
}

// helper type to allow us to omit properties from a union type
type DistributiveOmit<T, K extends keyof T> = T extends T ? Omit<T, K> : never;
export type UpdateElementPatch = Partial<
  DistributiveOmit<Element, 'type' | 'kind'>
>;

export function generateUpdateElement(
  slideId: string,
  elementId: string,
  patch: UpdateElementPatch
): ChangeFn<WhiteboardDocument> {
  return (doc) => {
    const slide = getSlide(doc, slideId);

    if (!slide) {
      return;
    }

    const element = getElement(doc, slideId, elementId);

    if (element) {
      Object.entries(patch).forEach(([key, value]) => {
        (element as YMap<unknown>).set(key, value);
      });
    }
  };
}

/** Delete an element by element id. */
export function generateRemoveElement(
  slideId: string,
  elementId: string
): ChangeFn<WhiteboardDocument> {
  return (doc) => {
    const slide = getSlide(doc, slideId);

    if (!slide) {
      return;
    }

    slide.get('elements').delete(elementId);
    cleanupElementIds(slide);
  };
}

/**
 * Removes all duplicating or leftover element ids that can happen due too
 * conflicts.
 **/
function cleanupElementIds(slide: SharedMap<Slide>): void {
  const discoveredElementIds = new Set();
  let i = 0;

  const elementIds = slide.get('elementIds');
  const elements = slide.get('elements');

  while (i < elementIds.length) {
    const slideId = elementIds.get(i);
    const isDuplicate = discoveredElementIds.has(slideId);
    const isLeftover = !elements.has(slideId);

    if (isDuplicate || isLeftover) {
      elementIds.delete(i);
    } else {
      discoveredElementIds.add(slideId);
      ++i;
    }
  }
}
