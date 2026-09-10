/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

export const STATE_EVENT_4143_RTC_SLOT = 'org.matrix.msc4143.rtc.slot';

export type RtcSlot = {
  status: string;
  application: {
    type: 'net.nordeck.whiteboard';
  };
};

const rtcSlotSchema = Joi.object<RtcSlot, true>({
  status: Joi.string().valid('open').required(),
  application: Joi.object({
    type: Joi.string().valid('net.nordeck.whiteboard').required(),
  })
    .unknown()
    .required(),
}).unknown();

export function isValidWhiteboardRtcSlotEvent(
  event: StateEvent<unknown>,
): event is StateEvent<RtcSlot> {
  return isValidEvent(event, STATE_EVENT_4143_RTC_SLOT, rtcSlotSchema);
}
