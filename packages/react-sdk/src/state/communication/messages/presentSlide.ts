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

export const PRESENT_SLIDE_MESSAGE = 'net.nordeck.whiteboard.present_slide';

export type PresentSlide = {
  view: { isEditMode: boolean; slideId: string } | undefined;
};

const presentSlideSchema = Joi.object<PresentSlide, true>({
  view: Joi.object({
    isEditMode: Joi.boolean().required(),
    slideId: Joi.string().required(),
  }).unknown(),
}).unknown();

export function isValidPresentSlideMessage(
  message: Message,
): message is Message<PresentSlide> {
  if (message.type !== PRESENT_SLIDE_MESSAGE) {
    return false;
  }

  const result = presentSlideSchema.validate(message.content);

  if (result.error) {
    loglevel.error(
      'Error while validating present slide message',
      result.error,
    );
    return false;
  }

  return true;
}
