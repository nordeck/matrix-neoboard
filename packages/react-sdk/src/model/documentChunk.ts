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

import { RelatesTo, RoomEvent } from '@matrix-widget-toolkit/api';
import Joi from 'joi';
import { isValidEvent } from './validation';

export const ROOM_EVENT_DOCUMENT_CHUNK =
  'net.nordeck.whiteboard.document.chunk';

export type DocumentChunk = {
  documentId: string;
  sequenceNumber: number;
  data: string;
  'm.relates_to': RelatesTo<'m.reference'>;
};

const documentChunkSchema = Joi.object<DocumentChunk, true>({
  documentId: Joi.string().required(),
  sequenceNumber: Joi.number().integer().strict().min(0).required(),
  data: Joi.string().base64().required(),
  'm.relates_to': Joi.object({
    rel_type: Joi.string().valid('m.reference').required(),
    event_id: Joi.string().required(),
  })
    .unknown()
    .required(),
}).unknown();

export function isValidDocumentChunkRoomEvent(
  event: RoomEvent<unknown>,
): event is RoomEvent<DocumentChunk> {
  return isValidEvent(event, ROOM_EVENT_DOCUMENT_CHUNK, documentChunkSchema);
}
