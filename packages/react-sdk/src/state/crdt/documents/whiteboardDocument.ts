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

import Joi, { AnySchema, ObjectSchema } from 'joi';
import { without } from 'lodash';
import loglevel from 'loglevel';
import { ChangeFn, Document } from '../types';
import {
  createMigrations,
  getYDocUpdateDocumentVersion,
  MigrationFn,
  SharedMap,
  YArray,
  YDocument,
  YMap,
} from '../y';
import { UndoRedoItemValidator } from '../y/yDocumentUndoManager';
import { disallowElementIds, Element, elementSchema } from './elements';
import { getNormalizedSlideIds, getSlideLock } from './operations';
import { generateFramesUpdate } from './updates';

export type SlideLock = {
  userId: string;
};

export type Slide = {
  elements: YMap<SharedMap<Element>>;
  elementIds: YArray<string>;
  frameElementIds?: YArray<string>;
  lock?: SlideLock;
};

export type WhiteboardDocument = {
  slides: YMap<SharedMap<Slide>>;
  slideIds: YArray<string>;
};

// Generate an initial slide. All whiteboards will have this slide id!
const slideId = 'IN4h74suMiIAK4AVMAdl_';

/** Initialize the data object */
export function initializeWhiteboardDocument(
  doc: SharedMap<WhiteboardDocument>,
) {
  const slide = new YMap<unknown>() as SharedMap<Slide>;
  slide.set('elements', new YMap());
  slide.set('elementIds', new YArray());

  doc.set('slides', new YMap<SharedMap<Slide>>([[slideId, slide]]));
  doc.set('slideIds', YArray.from([slideId]));
}

/** Initialize frameElementIds of the initial slide */
export function initializeSlideFrameElementIds(
  doc: SharedMap<WhiteboardDocument>,
) {
  doc.get('slides').get(slideId)?.set('frameElementIds', new YArray());
}

export enum WhiteboardDocumentVersion {
  v0 = '0',
  v1 = '1',
}

const whiteboardDocumentVersions: WhiteboardDocumentVersion[] = Object.values(
  WhiteboardDocumentVersion,
);

export function isWhiteboardDocumentVersion(
  documentVersion: string,
): documentVersion is WhiteboardDocumentVersion {
  return (whiteboardDocumentVersions as string[]).includes(documentVersion);
}

const whiteboardDocumentVersionSchema = Joi.string()
  .pattern(/^(0|[1-9]\d*)$/)
  .strict()
  .required();

export function isValidWhiteboardDocumentVersion(
  documentVersion: string,
): boolean {
  return (
    whiteboardDocumentVersionSchema.validate(documentVersion).error ===
    undefined
  );
}

export function compareWhiteboardDocumentVersions(
  a: WhiteboardDocumentVersion,
  b: WhiteboardDocumentVersion,
): number {
  const aIndex = whiteboardDocumentVersions.indexOf(a);
  const bIndex = whiteboardDocumentVersions.indexOf(b);
  return aIndex - bIndex;
}

/**
 * Selects all versions up to passed version including passed one.
 * @param whiteboardDocumentVersion
 */
export function selectWhiteboardDocumentVersionsUpTo(
  whiteboardDocumentVersion: WhiteboardDocumentVersion,
): WhiteboardDocumentVersion[] {
  const versionIndex = whiteboardDocumentVersions.indexOf(
    whiteboardDocumentVersion,
  );
  if (versionIndex === -1) {
    throw new Error(`Cannot find version: '${whiteboardDocumentVersion}'`);
  }
  return whiteboardDocumentVersions.slice(0, versionIndex + 1);
}

// Never change or remove a migration function, always add new migration functions to the end
// of the list!
export const migrationFunctions: MigrationFn<WhiteboardDocument>[] = [
  initializeWhiteboardDocument,
  initializeSlideFrameElementIds,
];

export const whiteboardDocumentV0Migrations = createMigrations(
  // Never change or remove migration functions
  migrationFunctions.slice(0, 1),
  WhiteboardDocumentVersion.v0,
);

export const whiteboardDocumentV1Migrations = createMigrations(
  // Never change or remove migration functions
  migrationFunctions.slice(0, 2),
  WhiteboardDocumentVersion.v1,
);

export function createWhiteboardDocument(
  whiteboardDocumentVersion: WhiteboardDocumentVersion = WhiteboardDocumentVersion.v0,
): Document<WhiteboardDocument> {
  return YDocument.create(
    getMigrations(whiteboardDocumentVersion),
    whiteboardDocumentVersion,
    keepWhiteboardUndoRedoItem,
  );
}

function getMigrations(
  whiteboardDocumentVersion: WhiteboardDocumentVersion,
): Uint8Array[] {
  switch (whiteboardDocumentVersion) {
    case WhiteboardDocumentVersion.v0:
      return whiteboardDocumentV0Migrations;

    case WhiteboardDocumentVersion.v1:
      return whiteboardDocumentV1Migrations;

    default:
      throw new Error(
        'Unexpected whiteboard document version:' + whiteboardDocumentVersion,
      );
  }
}

/**
 * Generate a change function to update.
 * @param document a document used as a data source to create an update function
 * @param targetDocumentVersion a target whiteboard document version
 */
export function generateUpdate(
  document: Document<Record<string, unknown>>,
  targetDocumentVersion: string,
): ChangeFn<WhiteboardDocument> {
  const documentVersion = document.getDocumentVersion();

  if (documentVersion === targetDocumentVersion) {
    throw new Error(
      `Update to '${targetDocumentVersion}' version is not needed: source and target document versions are the same`,
    );
  }

  let isInvalidDocument: boolean | undefined;
  if (
    documentVersion === WhiteboardDocumentVersion.v0 &&
    targetDocumentVersion === WhiteboardDocumentVersion.v1
  ) {
    if (isValidWhiteboardDocument(document)) {
      return generateFramesUpdate(document.getData());
    } else {
      isInvalidDocument = true;
    }
  }

  if (isInvalidDocument) {
    throw Error('Update generation failed: document is invalid');
  }

  throw new Error(
    `Update generation failed: update from '${document.getDocumentVersion()}' to '${targetDocumentVersion}' is not implemented`,
  );
}

function getSlideSchema(
  whiteboardDocumentVersion: WhiteboardDocumentVersion,
): ObjectSchema {
  let frameElementIdsSchema: AnySchema;
  if (whiteboardDocumentVersion === WhiteboardDocumentVersion.v0) {
    frameElementIdsSchema = Joi.any();
  } else if (whiteboardDocumentVersion === WhiteboardDocumentVersion.v1) {
    frameElementIdsSchema = Joi.array()
      .items(Joi.string().not(...disallowElementIds))
      .required();
  } else {
    throw new Error(
      'Unexpected whiteboard document version:' + whiteboardDocumentVersion,
    );
  }

  return Joi.object({
    elements: Joi.object()
      .pattern(Joi.string().not(...disallowElementIds), elementSchema)
      .required(),
    elementIds: Joi.array()
      .items(Joi.string().not(...disallowElementIds))
      .required(),
    frameElementIds: frameElementIdsSchema,
    lock: Joi.object({
      userId: Joi.string().required(),
    }).unknown(),
  })
    .unknown()
    .required();
}

export const whiteboardDocumentV0Schema = Joi.object({
  slides: Joi.object()
    .pattern(Joi.string(), getSlideSchema(WhiteboardDocumentVersion.v0))
    .required(),
  slideIds: Joi.array().items(Joi.string()).required(),
})
  .unknown()
  .required();

export const whiteboardDocumentV1Schema = Joi.object({
  slides: Joi.object()
    .pattern(Joi.string(), getSlideSchema(WhiteboardDocumentVersion.v1))
    .required(),
  slideIds: Joi.array().items(Joi.string()).required(),
})
  .unknown()
  .required();

function getWhiteboardDocumentSchema(
  whiteboardDocumentVersion: WhiteboardDocumentVersion,
): AnySchema<WhiteboardDocument> {
  switch (whiteboardDocumentVersion) {
    case WhiteboardDocumentVersion.v0:
      return whiteboardDocumentV0Schema;
    case WhiteboardDocumentVersion.v1:
      return whiteboardDocumentV1Schema;
    default:
      throw new Error(
        'Unexpected whiteboard document version:' + whiteboardDocumentVersion,
      );
  }
}

export function isValidWhiteboardDocument(
  document: Document<Record<string, unknown>>,
): document is Document<WhiteboardDocument> {
  const documentVersion = document.getDocumentVersion();
  if (!isWhiteboardDocumentVersion(documentVersion)) {
    return false;
  }

  const result = getWhiteboardDocumentSchema(documentVersion).validate(
    document.getData().toJSON(),
  );

  if (result.error) {
    loglevel.error('Error while validating the document', result.error);
    return false;
  }

  return true;
}

export function isValidWhiteboardDocumentSnapshot(data: Uint8Array): boolean {
  const documentVersion = getYDocUpdateDocumentVersion(data);

  if (!documentVersion) {
    return false;
  }

  if (!isValidWhiteboardDocumentVersion(documentVersion)) {
    return false;
  }

  if (!isWhiteboardDocumentVersion(documentVersion)) {
    // it is unsupported whiteboard document
    // can't validate the contents as we don't know the schema
    // should be only used to make notification about unsupported document
    // assume to be valid
    return true;
  }

  const document = createWhiteboardDocument(documentVersion);

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
