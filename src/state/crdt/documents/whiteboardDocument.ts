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

import Joi from 'joi';
import { without } from 'lodash';
import loglevel from 'loglevel';
import { Document } from '../types';
import { createMigrations, SharedMap, YArray, YDocument, YMap } from '../y';
import { UndoRedoItemValidator } from '../y/yDocumentUndoManager';
import { Element, elementSchema } from './elements';
import { getNormalizedSlideIds, getSlideLock } from './operations';

export type SlideLock = {
  userId: string;
};

export type Slide = {
  elements: YMap<SharedMap<Element>>;
  elementIds: YArray<string>;
  lock?: SlideLock;
};

export type WhiteboardDocument = {
  slides: YMap<SharedMap<Slide>>;
  slideIds: YArray<string>;
};

/** Initialize the data object */
export function initializeWhiteboardDocument(
  doc: SharedMap<WhiteboardDocument>,
) {
  // Generate an initial slide. All whiteboards will have this slide id!
  const slideId = 'IN4h74suMiIAK4AVMAdl_';
  const slide = new YMap<unknown>() as SharedMap<Slide>;
  slide.set('elements', new YMap());
  slide.set('elementIds', new YArray());

  doc.set('slides', new YMap<SharedMap<Slide>>([[slideId, slide]]));
  doc.set('slideIds', YArray.from([slideId]));
}

export const WHITEBOARD_DOCUMENT_VERSION = '0';

export const whiteboardDocumentMigrations = createMigrations(
  // Never change or remove a migration, always add new migrations to the end
  // of the list!
  [initializeWhiteboardDocument],
  WHITEBOARD_DOCUMENT_VERSION,
);

export function createWhiteboardDocument(): Document<WhiteboardDocument> {
  return YDocument.create(
    whiteboardDocumentMigrations,
    WHITEBOARD_DOCUMENT_VERSION,
    keepWhiteboardUndoRedoItem,
  );
}

const slideSchema = Joi.object({
  elements: Joi.object().pattern(Joi.string(), elementSchema).required(),
  elementIds: Joi.array().items(Joi.string()).required(),
  lock: Joi.object({
    userId: Joi.string().required(),
  }).unknown(),
})
  .unknown()
  .required();

export const whiteboardDocumentSchema = Joi.object({
  slides: Joi.object().pattern(Joi.string(), slideSchema).required(),
  slideIds: Joi.array().items(Joi.string()).required(),
})
  .unknown()
  .required();

export function isValidWhiteboardDocument(
  document: Document<Record<string, unknown>>,
): document is Document<WhiteboardDocument> {
  const result = whiteboardDocumentSchema.validate(document.getData().toJSON());

  if (result.error) {
    loglevel.error('Error while validating the document', result.error);
    return false;
  }

  return true;
}

export function isValidWhiteboardDocumentSnapshot(data: Uint8Array): boolean {
  const document = createWhiteboardDocument();

  try {
    document.mergeFrom(data);
  } catch (ex) {
    loglevel.error('Error while merging remote document', ex);
    return false;
  }

  return isValidWhiteboardDocument(document);
}

/**
 * This function validates the undo or redo item against the current whiteboard
 * state and takes care that we don't apply unwanted changes to the document.
 *
 * This includes:
 * 1. Don't change slides that are locked with undo/redo.
 * 2. Don't revert a slide addition, if that would lead to removing
 *    the last slide of the whiteboard.
 */
export function keepWhiteboardUndoRedoItem(
  doc: SharedMap<WhiteboardDocument>,
): UndoRedoItemValidator {
  const lockedSlides = new Set(
    getNormalizedSlideIds(doc).filter(
      (slideId) => getSlideLock(doc, slideId) !== undefined,
    ),
  );

  return (changes) => {
    // if the addition of the slide lock is part of the stack (that is it was
    // done in this session), we remember this to not remove changes that were
    // done prior to the slide lock.
    const undoStackUnlocksSlides = changes
      .filter(
        ({ props: [slides, _, lock], isInsertion, isDeletion }) =>
          slides === 'slides' && lock === 'lock' && isInsertion && !isDeletion,
      )
      .map(({ props: [_, slideId] }) => slideId);
    undoStackUnlocksSlides.forEach((s) => lockedSlides.delete(s));

    // ignore all changes if they edit a slide that is locked
    if (
      changes.some(
        (c) => c.props[0] === 'slides' && lockedSlides.has(c.props[1]),
      )
    ) {
      return false;
    }

    // ignore all changes that will result in the deletion of the last slide
    const allSlideChanges = changes.filter(
      (c) => c.props.length === 2 && c.props[0] === 'slides',
    );
    const allSlideDeletionsInChanges = allSlideChanges
      .filter((c) => c.isInsertion && !c.isDeletion)
      .map((c) => c.props[1]);
    const allSlideAdditionsInChanges = allSlideChanges
      .filter((c) => !c.isInsertion && c.isDeletion)
      .map((c) => c.props[1]);

    if (allSlideDeletionsInChanges.length > 0) {
      const remainingSlides = without(
        getNormalizedSlideIds(doc).concat(...allSlideAdditionsInChanges),
        ...allSlideDeletionsInChanges,
      );

      if (remainingSlides.length === 0) {
        return false;
      }
    }

    return true;
  };
}
