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
import { isValidEvent } from './validation';

export const DEFAULT_RTC_EXPIRE_DURATION = 1000 * 60 * 60 * 4;

// unsable prefix for m.rtc.member in MSC4143
export const STATE_EVENT_RTC_MEMBER = 'org.matrix.msc3401.call.member';

export type RTCFocus = {
  type: string;
  [key: string]: unknown;
};

export interface LivekitFocusConfig extends RTCFocus {
  type: 'livekit';
  livekit_service_url: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isLivekitFocusConfig = (
  object: any,
): object is LivekitFocusConfig =>
  object.type === 'livekit' && 'livekit_service_url' in object;

export interface LivekitFocus extends LivekitFocusConfig {
  livekit_alias: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isLivekitFocus = (object: any): object is LivekitFocus =>
  isLivekitFocusConfig(object) && 'livekit_alias' in object;

export interface LivekitFocusActive extends RTCFocus {
  type: 'livekit';
  focus_selection: 'oldest_membership';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const isLivekitFocusActive = (
  object: any,
): object is LivekitFocusActive =>
  object.type === 'livekit' && 'focus_selection' in object;

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
    call_id: '',
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

/*
export class RTCMembership {
  private membershipData: RTCSessionMembershipData;

  public constructor(
    private parentEvent: StateEvent<unknown>
  ) {
    if (!isValidRTCMembershipDataStateEvent(parentEvent)) {
        throw Error(
            `unknown RTCMembership data.`,
        );
    } else {
        this.membershipData = parentEvent.content;
    }
  }

  public get sender(): string | undefined {
    return this.parentEvent.sender;
  }

  public get eventId(): string | undefined {
      return this.parentEvent.event_id;
  }

  public get callId(): string {
      return this.membershipData.callId;
  }

  public get deviceId(): string {
      return this.membershipData.deviceId;
  }

  public get application(): string | undefined {
      return this.membershipData.application;
  }

  public get scope(): string | undefined {
      return this.membershipData.scope;
  }

  public get membershipID(): string {
      return this.createdTs().toString();
  }

  public createdTs(): number {
      return this.membershipData.createdTs ?? this.parentEvent.origin_server_ts;
  }

  public getAbsoluteExpiry(): number {
      return this.createdTs() + (this.membershipData.expires ?? DEFAULT_RTC_EXPIRE_DURATION);
  }

  public getMsUntilExpiry(): number {
      return this.getAbsoluteExpiry() - Date.now();
  }

  public isExpired(): boolean {
      return this.getMsUntilExpiry() <= 0;
  }

  public getPreferredFoci(): RTCFocus[] {
      return this.membershipData.foci_preferred;
  }

  public getFocusSelection(): string | undefined {
      const focusActive = this.membershipData.focus_active;
      if (isLivekitFocusActive(focusActive)) {
          return focusActive.focus_selection;
      }
  }
}
*/
