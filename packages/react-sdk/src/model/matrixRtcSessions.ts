/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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
import { RTCFocus } from '../state/communication';
import { isValidEvent } from './validation';

export const RTC_APPLICATION_WHITEBOARD = 'net.nordeck.whiteboard';

export const DEFAULT_RTC_EXPIRE_DURATION = 1000 * 60 * 60 * 4;

// unstable prefix for m.rtc.member in MSC4143
export const STATE_EVENT_RTC_MEMBER = 'org.matrix.msc3401.call.member';

// Following Matrix JS SDK's SessionMembershipData
// see https://github.com/matrix-org/matrix-js-sdk/blob/d6ede767c929f7be179d456b5a0433be21ccaf7c/src/matrixrtc/CallMembership.ts#L35
// with some changes, such as not including `created_ts` and making `expires` and 'scope' required
export type RTCSessionEventContent = {
  application: string;
  call_id: string;
  device_id: string;
  focus_active: RTCFocus;
  foci_preferred: RTCFocus[];
  scope: string;
  expires: number;
};

export type RTCSessions = {
  sessions: RTCSessionEventContent[];
};

const rtcSessionEventContentSchema = Joi.alternatives().try(
  // Empty object option
  Joi.object().max(0),

  // Full object option with all the requirements
  Joi.object<RTCSessionEventContent, true>({
    application: Joi.string().required(),
    call_id: Joi.string().required(),
    device_id: Joi.string().required(),
    focus_active: Joi.object().required(),
    foci_preferred: Joi.array().items(Joi.object()).required(),
    scope: Joi.string().required(),
    expires: Joi.number().required(),
  }).unknown(),
);

export function isValidRTCSessionStateEvent(
  event: StateEvent<unknown>,
): event is StateEvent<RTCSessionEventContent> {
  return isValidEvent(
    event,
    STATE_EVENT_RTC_MEMBER,
    rtcSessionEventContentSchema,
    true,
  );
}

export function isWhiteboardRTCSessionStateEvent(
  event: StateEvent<unknown>,
): event is StateEvent<RTCSessionEventContent> {
  return (
    isValidRTCSessionStateEvent(event) &&
    (event.content.application === RTC_APPLICATION_WHITEBOARD ||
      Object.keys(event.content).length === 0)
  );
}

export function isRTCSessionNotExpired(
  event: StateEvent<RTCSessionEventContent>,
): boolean {
  if (!event.content || Object.keys(event.content).length === 0) {
    return false;
  }
  return (
    event.content.expires !== undefined && event.content.expires > Date.now()
  );
}

export function newRTCSession(
  deviceId: string,
  whiteboardId: string,
): RTCSessionEventContent {
  return {
    application: RTC_APPLICATION_WHITEBOARD,
    call_id: whiteboardId, // if empty, it will be picked up by the JS SDK for calls
    device_id: deviceId,
    focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
    foci_preferred: [],
    scope: 'm.room',
    expires: Date.now() + DEFAULT_RTC_EXPIRE_DURATION,
  };
}
