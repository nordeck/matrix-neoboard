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

import { describe, expect, it } from 'vitest';
import {
  isLivekitTransport,
  isValidWhiteboardRtcMemberEvent,
} from './matrixRtcMember';

describe('isValidWhiteboardRtcMemberEvent', () => {
  it('should accept rtc member join event', () => {
    expect(
      isValidWhiteboardRtcMemberEvent({
        type: 'org.matrix.msc4143.rtc.member',
        sender: '@user-id:example.com',
        content: {
          slot_id: `net.nordeck.whiteboard#whiteboard-id`,
          member: {
            id: '$member-id-0',
            membership: 'join',
            device_id: '$device-id-0',
          },
          application: {
            type: 'net.nordeck.whiteboard',
            whiteboard_id: 'whiteboard-id',
          },
          transports: {
            published: [
              {
                type: 'livekit',
                livekit_service_url: 'https://livekit-jwt.example.com',
              },
            ],
            can_subscribe: ['livekit'],
          },
          msc4354_sticky_key: '$member-id-0',
        },
        origin_server_ts: 0,
        event_id: '$event-id',
        room_id: '!room-id:example.com',
      }),
    ).toBe(true);
  });

  it.each([
    { slot_id: undefined },
    { slot_id: 111 },
    { member: undefined },
    { application: undefined },
    { transports: undefined },
    { transports: [] },
    { msc4354_sticky_key: undefined },
  ])(
    'should reject rtc member join event with content patch %js',
    (patch: object) => {
      expect(
        isValidWhiteboardRtcMemberEvent({
          type: 'org.matrix.msc4143.rtc.member',
          sender: '@user-id:example.com',
          content: {
            slot_id: `net.nordeck.whiteboard#whiteboard-id`,
            member: {
              id: '$member-id-0',
              membership: 'join',
              device_id: '$device-id-0',
            },
            application: {
              type: 'net.nordeck.whiteboard',
              whiteboard_id: 'whiteboard-id',
            },
            transports: {
              published: [
                {
                  type: 'livekit',
                  livekit_service_url: 'https://livekit-jwt.example.com',
                },
              ],
              can_subscribe: ['livekit'],
            },
            msc4354_sticky_key: '$member-id-0',
            ...patch,
          },
          origin_server_ts: 0,
          event_id: '$event-id',
          room_id: '!room-id:example.com',
        }),
      ).toBe(false);
    },
  );

  it.each([
    { id: undefined },
    { id: 111 },
    { membership: undefined },
    { membership: 'something' },
    { device_id: undefined },
    { device_id: 111 },
  ])(
    'should reject rtc member join event with member patch %js',
    (patch: object) => {
      expect(
        isValidWhiteboardRtcMemberEvent({
          type: 'org.matrix.msc4143.rtc.member',
          sender: '@user-id:example.com',
          content: {
            slot_id: `net.nordeck.whiteboard#whiteboard-id`,
            member: {
              id: '$member-id-0',
              membership: 'join',
              device_id: '$device-id-0',
              ...patch,
            },
            application: {
              type: 'net.nordeck.whiteboard',
              whiteboard_id: 'whiteboard-id',
            },
            transports: {
              published: [
                {
                  type: 'livekit',
                  livekit_service_url: 'https://livekit-jwt.example.com',
                },
              ],
              can_subscribe: ['livekit'],
            },
            msc4354_sticky_key: '$member-id-0',
          },
          origin_server_ts: 0,
          event_id: '$event-id',
          room_id: '!room-id:example.com',
        }),
      ).toBe(false);
    },
  );

  it.each([
    { type: undefined },
    { type: 111 },
    { type: 'net.other.application' },
    { whiteboard_id: undefined },
    { whiteboard_id: 111 },
  ])(
    'should reject rtc member join event with application patch %js',
    (patch: object) => {
      expect(
        isValidWhiteboardRtcMemberEvent({
          type: 'org.matrix.msc4143.rtc.member',
          sender: '@user-id:example.com',
          content: {
            slot_id: `net.nordeck.whiteboard#whiteboard-id`,
            member: {
              id: '$member-id-0',
              membership: 'join',
              device_id: '$device-id-0',
            },
            application: {
              type: 'net.nordeck.whiteboard',
              whiteboard_id: 'whiteboard-id',
              ...patch,
            },
            transports: {
              published: [
                {
                  type: 'livekit',
                  livekit_service_url: 'https://livekit-jwt.example.com',
                },
              ],
              can_subscribe: ['livekit'],
            },
            msc4354_sticky_key: '$member-id-0',
          },
          origin_server_ts: 0,
          event_id: '$event-id',
          room_id: '!room-id:example.com',
          msc4354_sticky: {
            duration_ms: 3600000,
          },
        }),
      ).toBe(false);
    },
  );

  it.each([
    { published: undefined },
    { published: {} },
    { can_subscribe: [] },
    { can_subscribe: ['something'] },
  ])(
    'should reject rtc member join event with transports patch %js',
    (patch: object) => {
      expect(
        isValidWhiteboardRtcMemberEvent({
          type: 'org.matrix.msc4143.rtc.member',
          sender: '@user-id:example.com',
          content: {
            slot_id: `net.nordeck.whiteboard#whiteboard-id`,
            member: {
              id: '$member-id-0',
              membership: 'join',
              device_id: '$device-id-0',
            },
            application: {
              type: 'net.nordeck.whiteboard',
              whiteboard_id: 'whiteboard-id',
            },
            transports: {
              published: [
                {
                  type: 'livekit',
                  livekit_service_url: 'https://livekit-jwt.example.com',
                },
              ],
              can_subscribe: ['livekit'],
              ...patch,
            },
            msc4354_sticky_key: '$member-id-0',
          },
          origin_server_ts: 0,
          event_id: '$event-id',
          room_id: '!room-id:example.com',
          msc4354_sticky: {
            duration_ms: 3600000,
          },
        }),
      ).toBe(false);
    },
  );

  it('should accept rtc member leave event', () => {
    expect(
      isValidWhiteboardRtcMemberEvent({
        type: 'org.matrix.msc4143.rtc.member',
        sender: '@user-id:example.com',
        content: {
          slot_id: `net.nordeck.whiteboard#whiteboard-id`,
          member: {
            id: '$member-id-0',
            membership: 'leave',
            device_id: '$device-id-0',
          },
          leave_reason: {
            code: 'leave',
          },
          msc4354_sticky_key: '$member-id-0',
        },
        origin_server_ts: 0,
        event_id: '$event-id',
        room_id: '!room-id:example.com',
        msc4354_sticky: {
          duration_ms: 3600000,
        },
      }),
    ).toBe(true);
  });

  it.each(['leave', 'delayed_leave', 'slot_closed'])(
    'should accept rtc member leave event with code %s',
    (code) => {
      expect(
        isValidWhiteboardRtcMemberEvent({
          type: 'org.matrix.msc4143.rtc.member',
          sender: '@user-id:example.com',
          content: {
            slot_id: `net.nordeck.whiteboard#whiteboard-id`,
            member: {
              id: '$member-id-0',
              membership: 'leave',
              device_id: '$device-id-0',
            },
            leave_reason: {
              code: code,
            },
            msc4354_sticky_key: '$member-id-0',
          },
          origin_server_ts: 0,
          event_id: '$event-id',
          room_id: '!room-id:example.com',
          msc4354_sticky: {
            duration_ms: 3600000,
          },
        }),
      ).toBe(true);
    },
  );

  it.each([
    { slot_id: undefined },
    { slot_id: 111 },
    { member: undefined },
    { member: 111 },
    { leave_reason: 111 },
    { msc4354_sticky_key: undefined },
  ])('should reject rtc member leave event with content patch %j', (patch) => {
    expect(
      isValidWhiteboardRtcMemberEvent({
        type: 'org.matrix.msc4143.rtc.member',
        sender: '@user-id:example.com',
        content: {
          slot_id: `net.nordeck.whiteboard#whiteboard-id`,
          member: {
            id: '$member-id-0',
            membership: 'leave',
            device_id: '$device-id-0',
          },
          leave_reason: {
            code: 'leave',
          },
          msc4354_sticky_key: '$member-id-0',
          ...patch,
        },
        origin_server_ts: 0,
        event_id: '$event-id',
        room_id: '!room-id:example.com',
        msc4354_sticky: {
          duration_ms: 3600000,
        },
      }),
    ).toBe(false);
  });

  it.each([
    { id: undefined },
    { id: 111 },
    { membership: undefined },
    { membership: 'something' },
    { device_id: undefined },
    { device_id: 111 },
  ])(
    'should reject rtc member leave event with member patch %js',
    (patch: object) => {
      expect(
        isValidWhiteboardRtcMemberEvent({
          type: 'org.matrix.msc4143.rtc.member',
          sender: '@user-id:example.com',
          content: {
            slot_id: `net.nordeck.whiteboard#whiteboard-id`,
            member: {
              id: '$member-id-0',
              membership: 'leave',
              device_id: '$device-id-0',
              ...patch,
            },
            leave_reason: {
              code: 'leave',
            },
            msc4354_sticky_key: '$member-id-0',
          },
          origin_server_ts: 0,
          event_id: '$event-id',
          room_id: '!room-id:example.com',
          msc4354_sticky: {
            duration_ms: 3600000,
          },
        }),
      ).toBe(false);
    },
  );

  it.each([{ code: undefined }, { code: 111 }])(
    'should reject rtc member leave event with member patch %js',
    (patch: object) => {
      expect(
        isValidWhiteboardRtcMemberEvent({
          type: 'org.matrix.msc4143.rtc.member',
          sender: '@user-id:example.com',
          content: {
            slot_id: `net.nordeck.whiteboard#whiteboard-id`,
            member: {
              id: '$member-id-0',
              membership: 'leave',
              device_id: '$device-id-0',
            },
            leave_reason: {
              code: 'leave',
              ...patch,
            },
            msc4354_sticky_key: '$member-id-0',
          },
          origin_server_ts: 0,
          event_id: '$event-id',
          room_id: '!room-id:example.com',
          msc4354_sticky: {
            duration_ms: 3600000,
          },
        }),
      ).toBe(false);
    },
  );
});

describe('isLivekitTransport', () => {
  it('should return true for livekit transport', () => {
    expect(
      isLivekitTransport({
        type: 'livekit',
        livekit_service_url: 'https://livekit-jwt.example.com',
      }),
    ).toBe(true);
  });

  it('should return false for invalid livekit transport', () => {
    expect(
      isLivekitTransport({
        type: 'livekit',
      }),
    ).toBe(false);
  });

  it('should return false for other transport', () => {
    expect(
      isLivekitTransport({
        type: 'something',
      }),
    ).toBe(false);
  });
});
