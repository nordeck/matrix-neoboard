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

export const FOCUS_ON_MESSAGE = 'net.nordeck.whiteboard.focus_on';

export type FocusOn = {
  slideId: string;
};

const focusOnSchema = Joi.object<FocusOn, true>({
  slideId: Joi.string().required(),
}).unknown();

export function isValidFocusOnMessage(
  message: Message,
): message is Message<FocusOn> {
  if (message.type !== FOCUS_ON_MESSAGE) {
    return false;
  }

  const result = focusOnSchema.validate(message.content);

  if (result.error) {
    loglevel.error('Error while validating focus on message', result.error);
    return false;
  }

  return true;
}
