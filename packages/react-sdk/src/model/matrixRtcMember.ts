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

import { RoomEvent } from '@matrix-widget-toolkit/api';
import Joi from 'joi';
import { isValidEvent } from './validation';

export const ROOM_EVENT_4143_RTC_MEMBER = 'org.matrix.msc4143.rtc.member';

type RtcMemberBase = {
  slot_id: string;
  msc4354_sticky_key: string;
};

const rtcMemberBaseSchema = Joi.object<RtcMemberBase, true>({
  slot_id: Joi.string().required(),
  msc4354_sticky_key: Joi.string().required(),
})
  .unknown()
  .required();

export type Transport = {
  type: string;
  [key: string]: unknown;
};

const transportSchema = Joi.object({
  type: Joi.string().required(),
}).unknown();

export type LivekitTransport = Transport & {
  type: 'livekit';
  livekit_service_url: string;
};

export type RtcMember = RtcMemberJoin | RtcMemberLeave;

export type RtcMemberJoin = RtcMemberBase & {
  member: {
    id: string;
    membership: 'join';
    device_id: string;
  };
  application: {
    type: 'net.nordeck.whiteboard';
    whiteboard_id: string;
  };
  transports: {
    published: Transport[];
    can_subscribe: string[];
  };
};

const rtcMemberJoinSchema = rtcMemberBaseSchema
  .append<RtcMemberJoin>({
    member: Joi.object({
      id: Joi.string().required(),
      membership: Joi.string().valid('join').required(),
      device_id: Joi.string().required(),
    })
      .unknown()
      .required(),
    application: Joi.object({
      type: Joi.string().valid('net.nordeck.whiteboard').required(),
      whiteboard_id: Joi.string().required(),
    })
      .unknown()
      .required(),
    transports: Joi.object({
      published: Joi.array().items(transportSchema).required(),
      can_subscribe: Joi.array()
        .items(Joi.string().valid('livekit'))
        .length(1)
        .required(),
    })
      .unknown()
      .required(),
  })
  .unknown()
  .required();

export type RtcMemberLeave = RtcMemberBase & {
  member: {
    id: string;
    membership: 'leave';
    device_id: string;
  };
  leave_reason?: {
    code: 'leave' | 'delayed_leave' | 'slot_closed';
    reason?: string;
  };
};

const rtcMemberLeaveSchema = rtcMemberBaseSchema.append<RtcMemberLeave>({
  member: Joi.object({
    id: Joi.string().required(),
    membership: Joi.string().valid('leave').required(),
    device_id: Joi.string().required(),
  })
    .unknown()
    .required(),
  leave_reason: Joi.object({
    code: Joi.string()
      .valid('leave', 'delayed_leave', 'slot_closed')
      .required(),
    reason: Joi.string(),
  }).unknown(),
});

const rtcMemberSchema = Joi.alternatives<RtcMember>().conditional(
  '.member.membership',
  [
    { is: 'join', then: rtcMemberJoinSchema },
    { is: 'leave', then: rtcMemberLeaveSchema },
  ],
);

export function isValidWhiteboardRtcMemberEvent(
  event: RoomEvent<unknown>,
): event is RoomEvent<RtcMember> {
  return isValidEvent(event, ROOM_EVENT_4143_RTC_MEMBER, rtcMemberSchema);
}

export function isRtcMemberJoinEvent(
  rtcMemberEvent: RoomEvent<RtcMember>,
): rtcMemberEvent is RoomEvent<RtcMemberJoin> {
  return rtcMemberEvent.content.member.membership === 'join';
}

export function isRtcMemberLeaveEvent(
  rtcMemberEvent: RoomEvent<RtcMember>,
): rtcMemberEvent is RoomEvent<RtcMemberLeave> {
  return rtcMemberEvent.content.member.membership === 'leave';
}

export function isLivekitTransport(
  transport: Transport,
): transport is LivekitTransport {
  return transport.type === 'livekit' && 'livekit_service_url' in transport;
}
