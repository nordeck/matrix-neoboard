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

import Joi, { AnySchema } from 'joi';
import loglevel from 'loglevel';
import {
  disallowElementIds,
  FrameElement,
  frameElementSchema,
  ImageElement,
  imageElementSchema,
  isWhiteboardDocumentVersion,
  PathElement,
  pathElementSchema,
  selectWhiteboardDocumentVersionsUpTo,
  ShapeElement,
  shapeElementSchema,
  WhiteboardDocumentVersion,
} from '../crdt';

type ElementWithId = {
  id?: string; // element id is exported if element is used in relations
};

type ShapeElementExport = ElementWithId & ShapeElement;

type PathElementExport = ElementWithId & PathElement;

export type FrameElementExport = ElementWithId & FrameElement;

type ImageElementExport = ElementWithId & ImageElement;

const elementWithIdBaseSchema = {
  id: Joi.string().not(...disallowElementIds),
};

const shapeElementExportSchema = shapeElementSchema
  .append(elementWithIdBaseSchema)
  .required();

const pathElementExportSchema = pathElementSchema
  .append(elementWithIdBaseSchema)
  .required();

const frameElementExportSchema = frameElementSchema
  .append(elementWithIdBaseSchema)
  .required();

const imageElementExportSchema = imageElementSchema
  .append(elementWithIdBaseSchema)
  .required();

export type ElementExport =
  | ShapeElementExport
  | PathElementExport
  | FrameElementExport
  | ImageElementExport;

const elementExportSchema = Joi.alternatives<ElementExport>().conditional(
  '.type',
  [
    { is: 'shape', then: shapeElementExportSchema },
    { is: 'path', then: pathElementExportSchema },
    { is: 'frame', then: frameElementExportSchema },
    { is: 'image', then: imageElementExportSchema },
  ],
);

export type SlideExport = {
  elements: Array<ElementExport>;
  lock?: {};
};

const slideExportSchema = Joi.object<SlideExport, true>({
  elements: Joi.array().items(elementExportSchema).required(),
  lock: Joi.object().unknown(),
}).unknown();

export type WhiteboardFileExport = {
  /** MXC URI of the exported file. */
  mxc: string;
  /** Base-64 encoded file data. */
  data: string;
};

const whiteboardFileExportSchema = Joi.object<WhiteboardFileExport, true>({
  mxc: Joi.string().required(),
  data: Joi.string().required(),
});

export type WhiteboardDocumentExport = {
  version: string;
  whiteboard: {
    slides: Array<SlideExport>;
    // make the export compatible with pre-images NeoBoards
    files?: Array<WhiteboardFileExport>;
  };
};

export function whiteboardDocumentVersionToExportString(
  whiteboardDocumentVersion: WhiteboardDocumentVersion,
): string {
  return `net.nordeck.whiteboard@v${parseInt(whiteboardDocumentVersion) + 1}`;
}

export function extractWhiteboardDocumentVersionFromExportString(
  value: string,
): WhiteboardDocumentVersion {
  const match = value.match(/^net\.nordeck\.whiteboard@v([\d]+)$/);
  if (!match) {
    throw new Error(
      `Unexpected whiteboard document version export string: ${value}`,
    );
  }

  const exportDocumentVersion = match[1];
  const documentVersion = (parseInt(exportDocumentVersion) - 1).toString();
  if (!isWhiteboardDocumentVersion(documentVersion)) {
    throw new Error(
      `Unexpected whiteboard document version: ${documentVersion}`,
    );
  }

  return documentVersion;
}

function createWhiteboardDocumentExportSchema(
  whiteboardDocumentVersion: WhiteboardDocumentVersion,
): AnySchema<WhiteboardDocumentExport> {
  const whiteboardDocumentVersions = selectWhiteboardDocumentVersionsUpTo(
    whiteboardDocumentVersion,
  );
  const exportWhiteboardDocumentVersions = whiteboardDocumentVersions.map(
    (version) => whiteboardDocumentVersionToExportString(version),
  );
  return Joi.object<WhiteboardDocumentExport, true>({
    version: Joi.string()
      .valid(...exportWhiteboardDocumentVersions)
      .required(),
    whiteboard: Joi.object({
      slides: Joi.array().items(slideExportSchema).required(),
      files: Joi.array().items(whiteboardFileExportSchema),
    })
      .unknown()
      .required(),
  })
    .unknown()
    .required();
}

const whiteboardDocumentInitialExportSchema =
  createWhiteboardDocumentExportSchema(WhiteboardDocumentVersion.v0);
const whiteboardDocumentFramesExportSchema =
  createWhiteboardDocumentExportSchema(WhiteboardDocumentVersion.v1);

function getWhiteboardDocumentExportSchema(
  whiteboardDocumentVersion: WhiteboardDocumentVersion,
): AnySchema<WhiteboardDocumentExport> {
  switch (whiteboardDocumentVersion) {
    case WhiteboardDocumentVersion.v0:
      return whiteboardDocumentInitialExportSchema;
    case WhiteboardDocumentVersion.v1:
      return whiteboardDocumentFramesExportSchema;
    default:
      throw new Error(
        'Unexpected whiteboard document version:' + whiteboardDocumentVersion,
      );
  }
}

export function isValidWhiteboardExportDocument(
  upperWhiteboardDocumentVersion: WhiteboardDocumentVersion,
  document: unknown,
): document is WhiteboardDocumentExport {
  const result = getWhiteboardDocumentExportSchema(
    upperWhiteboardDocumentVersion,
  ).validate(document);

  if (result.error) {
    loglevel.error('Error while validating the export document', result.error);
    return false;
  }

  return true;
}
