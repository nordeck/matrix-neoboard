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
import loglevel from 'loglevel';
import { Element } from '../crdt';
import { elementSchema } from '../crdt/documents/elements';

export type SlideExport = {
  elements: Array<Element>;
  lock?: {};
};

const slideExportSchema = Joi.object<SlideExport, true>({
  elements: Joi.array().items(elementSchema).required(),
  lock: Joi.object().unknown(),
}).unknown();

export type WhiteboardDocumentExport = {
  version: 'net.nordeck.whiteboard@v1';
  whiteboard: {
    slides: Array<SlideExport>;
  };
};

const whiteboardDocumentExportSchema = Joi.object<
  WhiteboardDocumentExport,
  true
>({
  version: Joi.string().valid('net.nordeck.whiteboard@v1').required(),
  whiteboard: Joi.object({
    slides: Joi.array().items(slideExportSchema).required(),
  })
    .unknown()
    .required(),
})
  .unknown()
  .required();

export function isValidWhiteboardExportDocument(
  document: unknown,
): document is WhiteboardDocumentExport {
  const result = whiteboardDocumentExportSchema.validate(document);

  if (result.error) {
    loglevel.error('Error while validating the export document', result.error);
    return false;
  }

  return true;
}
