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

import Joi from 'joi';
import loglevel from 'loglevel';
import { Message } from '../connection';

export const DOCUMENT_UPDATE_MESSAGE = 'net.nordeck.whiteboard.document_update';

export type DocumentUpdate = {
  documentId: string;
  data: string;
};

const cursorUpdateSchema = Joi.object<DocumentUpdate, true>({
  documentId: Joi.string().required(),
  data: Joi.string().required(),
}).unknown();

export function isValidDocumentUpdateMessage(
  message: Message
): message is Message<DocumentUpdate> {
  if (message.type !== DOCUMENT_UPDATE_MESSAGE) {
    return false;
  }

  const result = cursorUpdateSchema.validate(message.content);

  if (result.error) {
    loglevel.error(
      'Error while validating document update message',
      result.error
    );
    return false;
  }

  return true;
}
