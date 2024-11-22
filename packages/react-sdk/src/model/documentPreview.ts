/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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
import Joi from 'joi';
import { isValidEvent } from './validation';

export const STATE_EVENT_DOCUMENT_PREVIEW = 'net.nordeck.whiteboard.preview';

export type DocumentPreviewEvent = {
  preview: string;
};

const documentPreviewEventSchema = Joi.object<DocumentPreviewEvent, true>({
  preview: Joi.string().required(),
}).unknown();

export function isValidDocumentPreviewEvent(
  event: StateEvent<unknown>,
): event is StateEvent<DocumentPreviewEvent> {
  return isValidEvent(
    event,
    STATE_EVENT_DOCUMENT_PREVIEW,
    documentPreviewEventSchema,
  );
}
