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
import { Point, pointSchema } from '../../crdt';
import { Message } from '../connection';

export const CURSOR_UPDATE_MESSAGE = 'net.nordeck.whiteboard.cursor_update';

export type CursorUpdate = {
  slideId: string;
  position: Point;
};

const cursorUpdateSchema = Joi.object<CursorUpdate, true>({
  slideId: Joi.string().required(),
  position: pointSchema.required(),
}).unknown();

export function isValidCursorUpdateMessage(
  message: Message
): message is Message<CursorUpdate> {
  if (message.type !== CURSOR_UPDATE_MESSAGE) {
    return false;
  }

  const result = cursorUpdateSchema.validate(message.content);

  if (result.error) {
    loglevel.error(
      'Error while validating cursor update message',
      result.error
    );
    return false;
  }

  return true;
}
