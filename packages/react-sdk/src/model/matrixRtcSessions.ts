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
import { RTCFocus } from './rtcFocus';
import { isValidEvent } from './validation';

export const DEFAULT_RTC_EXPIRE_DURATION = 1000 * 60 * 60 * 4;

// unstable prefix for m.rtc.member in MSC4143
export const STATE_EVENT_RTC_MEMBER = 'org.matrix.msc3401.call.member';

export type RTCSessionEventContent = {
  call_id: string;
  scope: string | undefined;
  application: string;
  session_id: string;
  whiteboard_id: string;
  user_id: string;
  device_id: string;
  createdTs: number | undefined;
  expires: number | undefined;
  focus_active: RTCFocus;
  foci_preferred: RTCFocus[];
};

export type RTCSessions = {
  sessions: RTCSessionEventContent[];
};

const rtcSessionEventContentSchema = Joi.object<RTCSessionEventContent, true>({
  call_id: Joi.string().required(),
  scope: Joi.string().optional(),
  application: Joi.string().required(),
  session_id: Joi.string().required(),
  whiteboard_id: Joi.string().required(),
  user_id: Joi.string().required(),
  device_id: Joi.string().required(),
  createdTs: Joi.number().optional(),
  expires: Joi.number().optional(),
  focus_active: Joi.object().required(),
  foci_preferred: Joi.array().items(Joi.object()).required(),
}).unknown();

export function isValidRTCSessionStateEvent(
  event: StateEvent<unknown>,
): event is StateEvent<RTCSessionEventContent> {
  return isValidEvent(
    event,
    STATE_EVENT_RTC_MEMBER,
    rtcSessionEventContentSchema,
  );
}

export function isRTCSessionNotExpired(
  member: RTCSessionEventContent,
): boolean {
  return member.expires === undefined || member.expires > Date.now();
}

export function newRTCSession(
  userId: string,
  deviceId: string,
  whiteboardId: string,
): RTCSessionEventContent {
  return {
    // TODO: unsure what to do about call id
    call_id: whiteboardId, // if empty, it will be picked up by the JS SDK for calls
    scope: 'm.room',
    application: 'net.nordeck.whiteboard',
    session_id: `_${userId}_${deviceId}`,
    whiteboard_id: whiteboardId,
    user_id: userId,
    device_id: deviceId,
    createdTs: Date.now(),
    expires: Date.now() + DEFAULT_RTC_EXPIRE_DURATION,
    focus_active: { type: 'livekit', livekit_service_url: '' },
    foci_preferred: [],
  };
}
