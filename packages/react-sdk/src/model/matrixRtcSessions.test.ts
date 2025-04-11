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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockWhiteboardMembership } from '../lib/testUtils/matrixTestUtils';
import {
  DEFAULT_RTC_EXPIRE_DURATION,
  isRTCSessionNotExpired,
  isValidRTCSessionStateEvent,
  isWhiteboardRTCSessionStateEvent,
  newRTCSession,
  RTC_APPLICATION_WHITEBOARD,
} from './matrixRtcSessions';

describe('isValidRTCSessionStateEvent', () => {
  const fixedDate = 1742832000;

  beforeEach(() => {
    vi.spyOn(Date, 'now').mockImplementation(() => fixedDate);
  });

  afterEach(() => {
    vi.spyOn(Date, 'now').mockRestore();
  });

  it('should accept event', () => {
    expect(isValidRTCSessionStateEvent(mockWhiteboardMembership())).toBe(true);
  });

  it('should ignore other apps RTC membership events', () => {
    expect(
      isWhiteboardRTCSessionStateEvent({
        content: {
          call_id: 'whiteboard-id',
          scope: 'm.room',
          application: 'm.call',
          device_id: 'DEVICEID',
          expires: 100000000,
          focus_active: {
            type: 'livekit',
            focus_selection: 'oldest_membership',
          },
          foci_preferred: [
            {
              type: 'livekit',
              livekit_service_url: 'https://livekit.example.com',
            },
          ],
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        state_key: '_@user-id_DEVICEID',
        sender: '@user-id',
        type: 'org.matrix.msc3401.call.member',
      }),
    ).toBe(false);
  });

  it('should accept NeoBoard RTC membership events', () => {
    expect(isWhiteboardRTCSessionStateEvent(mockWhiteboardMembership())).toBe(
      true,
    );
  });

  it('should recognize expired sessions', () => {
    const event = mockWhiteboardMembership();
    event.content.expires = fixedDate + DEFAULT_RTC_EXPIRE_DURATION;
    expect(isRTCSessionNotExpired(event)).toBe(true);

    event.content.expires = fixedDate - 1;
    expect(isRTCSessionNotExpired(event)).toBe(false);
  });

  it('should create a new RTC session', () => {
    const event = newRTCSession('DEVICEID', 'whiteboard-id');
    expect(event).toEqual({
      call_id: 'whiteboard-id',
      scope: 'm.room',
      application: RTC_APPLICATION_WHITEBOARD,
      device_id: 'DEVICEID',
      expires: fixedDate + DEFAULT_RTC_EXPIRE_DURATION,
      focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
      foci_preferred: [],
    });
  });
});
