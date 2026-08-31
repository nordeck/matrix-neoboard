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

import { StateEvent } from '@matrix-widget-toolkit/api';
import Joi from 'joi';
import { isValidEvent } from './validation';

export const STATE_EVENT_WHITEBOARD = 'net.nordeck.whiteboard';
export const STATE_EVENT_4143_RTC_SLOT = 'org.matrix.msc4143.rtc.slot';

export type NordeckWhiteboard = {
  documentId: string;
};

export type Whiteboard = {
  status: string;
  application: {
    type: 'net.nordeck.whiteboard';
    documentId: string;
  };
};

const nordeckWhiteboardSchema = Joi.object<NordeckWhiteboard, true>({
  documentId: Joi.string().required(),
}).unknown();

const whiteboardSchema = Joi.object<Whiteboard, true>({
  status: Joi.string().valid('open').required(),
  application: Joi.object({
    type: Joi.string().valid('net.nordeck.whiteboard').required(),
    documentId: Joi.string().required(),
  })
    .unknown()
    .required(),
}).unknown();

export function isValidNordeckWhiteboardStateEvent(
  event: StateEvent<unknown>,
): event is StateEvent<NordeckWhiteboard> {
  return isValidEvent(event, STATE_EVENT_WHITEBOARD, nordeckWhiteboardSchema);
}

export function isValidWhiteboardStateEvent(
  event: StateEvent<unknown>,
): event is StateEvent<Whiteboard> {
  return isValidEvent(event, STATE_EVENT_4143_RTC_SLOT, whiteboardSchema);
}
