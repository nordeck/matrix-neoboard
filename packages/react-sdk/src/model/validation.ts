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

import {
  RoomEvent,
  StateEvent,
  ToDeviceMessageEvent,
} from '@matrix-widget-toolkit/api';
import Joi from 'joi';
import loglevel from 'loglevel';

export function isValidEvent(
  event:
    | RoomEvent<unknown>
    | StateEvent<unknown>
    | ToDeviceMessageEvent<unknown>,
  eventType: string,
  schema: Joi.AnySchema,
  allowEmptyContent = false,
): boolean {
  if (event.type !== eventType) {
    return false;
  }

  if (
    !event.content || typeof event.content !== 'object' || allowEmptyContent
      ? false
      : Object.keys(event.content).length === 0
  ) {
    return false;
  }

  const { error } = schema.validate(event.content);

  if (error) {
    loglevel.error('Event validation failed:', error.message, event);
    return false;
  }

  return true;
}
