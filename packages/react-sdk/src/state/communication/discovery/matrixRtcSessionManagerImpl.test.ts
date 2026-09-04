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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { nanoid } from '@reduxjs/toolkit';
import { UpdateDelayedEventAction } from 'matrix-widget-api';
import { firstValueFrom, take, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockRtcMember,
  mockRtcMemberJoinContent,
  mockRtcMemberLeaveContent,
} from '../../../lib/testUtils/matrixTestUtils';
import { ROOM_EVENT_4143_RTC_MEMBER } from '../../../model';
import { MatrixRtcSessionManagerImpl } from './matrixRtcSessionManagerImpl';

vi.mock('@reduxjs/toolkit', async () => ({
  ...(await vi.importActual<typeof import('@reduxjs/toolkit')>(
    '@reduxjs/toolkit',
  )),
  nanoid: vi.fn(),
}));

beforeEach(() => {
  let count = -1;
  vi.mocked(nanoid).mockImplementation(() => {
    count++;
    if (count === 0) return 'memberA';
    else if (count === 1) return 'memberB';
    else throw new Error('unexpected');
  });
});

describe('MatrixRtcSessionManagerImpl', () => {
  const removeSessionDelay = 8000;
  let widgetApi: MockedWidgetApi;

  let rtcSessionManager: MatrixRtcSessionManagerImpl;

  beforeEach(() => {
    vi.useFakeTimers();

    widgetApi = mockWidgetApi();
    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.userId = '@user-id:example.com';
    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.deviceId = 'DEVICE1';
    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.roomId = '!room-id:example.com';

    widgetApi.getRtcTransports.mockResolvedValue([
      {
        type: 'livekit',
        livekit_service_url: 'https://livekit-jwt.example.com',
      },
    ]);

    rtcSessionManager = new MatrixRtcSessionManagerImpl(
      widgetApi,
      removeSessionDelay,
    );

    // Sets system time for RTC member events to be sticky according to duration
    vi.setSystemTime(0);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();

    widgetApi.stop();
  });

  it('should join a whiteboard', async () => {
    const joinedPromise = firstValueFrom(
      rtcSessionManager.observeSessionJoined().pipe(take(1), toArray()),
    );

    await expect(rtcSessionManager.join('whiteboard-id')).resolves.toEqual({
      userId: '@user-id:example.com',
      sessionId: 'vtdiVgWoeLb2NR7dph94uv/R4+U6uQTmCYE9Q0BlgUw',
      memberId: 'memberA',
      livekitTransport: {
        livekitServiceUrl: 'https://livekit-jwt.example.com',
      },
    });

    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id',
        member: {
          id: 'memberA',
          membership: 'join',
          device_id: 'DEVICE1',
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
        msc4354_sticky_key: 'memberA',
      },
      { stickyDurationMs: 3600000 },
    );
    expect(widgetApi.sendDelayedRoomEvent).toHaveBeenCalledWith(
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id',
        member: {
          id: 'memberA',
          membership: 'leave',
          device_id: 'DEVICE1',
        },
        leave_reason: {
          code: 'delayed_leave',
        },
        msc4354_sticky_key: 'memberA',
      },
      removeSessionDelay,
      { stickyDurationMs: 3600000 },
    );
    expect(rtcSessionManager.getRemoveSessionDelayId()).toEqual(
      'syd_wlGAStYmBRRdjnWiHSDA',
    );
    await expect(joinedPromise).resolves.toEqual([
      {
        sessionId: 'vtdiVgWoeLb2NR7dph94uv/R4+U6uQTmCYE9Q0BlgUw',
        userId: '@user-id:example.com',
        memberId: 'memberA',
        livekitTransport: {
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
      },
    ]);
  });

  it('should leave a whiteboard', async () => {
    const joinedPromise = firstValueFrom(
      rtcSessionManager.observeSessionJoined().pipe(take(1), toArray()),
    );

    await rtcSessionManager.join('whiteboard-id');

    await expect(joinedPromise).resolves.toEqual([
      {
        sessionId: 'vtdiVgWoeLb2NR7dph94uv/R4+U6uQTmCYE9Q0BlgUw',
        userId: '@user-id:example.com',
        memberId: 'memberA',
        livekitTransport: {
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
      },
    ]);

    const leftPromise = firstValueFrom(
      rtcSessionManager.observeSessionLeft().pipe(take(1), toArray()),
    );

    await rtcSessionManager.leave();

    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id',
        member: {
          id: 'memberA',
          membership: 'leave',
          device_id: 'DEVICE1',
        },
        leave_reason: {
          code: 'leave',
        },
        msc4354_sticky_key: 'memberA',
      },
      { stickyDurationMs: 3600000 },
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledWith(
      'syd_wlGAStYmBRRdjnWiHSDA',
      UpdateDelayedEventAction.Cancel,
    );
    await expect(leftPromise).resolves.toEqual([
      {
        sessionId: 'vtdiVgWoeLb2NR7dph94uv/R4+U6uQTmCYE9Q0BlgUw',
        userId: '@user-id:example.com',
        memberId: 'memberA',
        livekitTransport: {
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
      },
    ]);
  });

  it('should join another whiteboard', async () => {
    await rtcSessionManager.join('whiteboard-id-0');

    widgetApi.sendDelayedRoomEvent.mockResolvedValue({
      delay_id: 'qqq_bcooaGNyKtyFbIGjGMQR',
    });

    await rtcSessionManager.join('whiteboard-id-1');

    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id-0',
        member: {
          id: 'memberA',
          membership: 'leave',
          device_id: 'DEVICE1',
        },
        leave_reason: {
          code: 'leave',
        },
        msc4354_sticky_key: 'memberA',
      },
      { stickyDurationMs: 3600000 },
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledWith(
      'syd_wlGAStYmBRRdjnWiHSDA',
      UpdateDelayedEventAction.Cancel,
    );

    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id-1',
        member: {
          id: 'memberB',
          membership: 'join',
          device_id: 'DEVICE1',
        },
        application: {
          type: 'net.nordeck.whiteboard',
          whiteboard_id: 'whiteboard-id-1',
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
        msc4354_sticky_key: 'memberB',
      },
      { stickyDurationMs: 3600000 },
    );
    expect(widgetApi.sendDelayedRoomEvent).toHaveBeenCalledWith(
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id-1',
        member: {
          id: 'memberB',
          membership: 'leave',
          device_id: 'DEVICE1',
        },
        leave_reason: {
          code: 'delayed_leave',
        },
        msc4354_sticky_key: 'memberB',
      },
      removeSessionDelay,
      { stickyDurationMs: 3600000 },
    );
    expect(rtcSessionManager.getRemoveSessionDelayId()).toEqual(
      'qqq_bcooaGNyKtyFbIGjGMQR',
    );
  });

  it('should join the same whiteboard', async () => {
    await rtcSessionManager.join('whiteboard-id');

    widgetApi.sendDelayedStateEvent.mockResolvedValue({
      delay_id: 'syd_wlGAStYmBRRdjnWiHSDA',
    });

    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendRoomEvent).toHaveBeenNthCalledWith(
      2,
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id',
        member: {
          id: 'memberA',
          membership: 'leave',
          device_id: 'DEVICE1',
        },
        leave_reason: {
          code: 'leave',
        },
        msc4354_sticky_key: 'memberA',
      },
      { stickyDurationMs: 3600000 },
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledWith(
      'syd_wlGAStYmBRRdjnWiHSDA',
      UpdateDelayedEventAction.Cancel,
    );

    expect(widgetApi.sendRoomEvent).toHaveBeenNthCalledWith(
      3,
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id',
        member: {
          id: 'memberB',
          membership: 'join',
          device_id: 'DEVICE1',
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
        msc4354_sticky_key: 'memberB',
      },
      { stickyDurationMs: 3600000 },
    );
    expect(widgetApi.sendDelayedRoomEvent).toHaveBeenNthCalledWith(
      2,
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id',
        member: {
          id: 'memberB',
          membership: 'leave',
          device_id: 'DEVICE1',
        },
        leave_reason: {
          code: 'delayed_leave',
        },
        msc4354_sticky_key: 'memberB',
      },
      removeSessionDelay,
      { stickyDurationMs: 3600000 },
    );
    expect(rtcSessionManager.getRemoveSessionDelayId()).toEqual(
      'syd_wlGAStYmBRRdjnWiHSDA',
    );
  });

  it('should update membership if sticky event is about to become not sticky', async () => {
    const joinedPromise = firstValueFrom(
      rtcSessionManager.observeSessionJoined().pipe(take(1), toArray()),
    );

    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id',
        member: {
          id: 'memberA',
          membership: 'join',
          device_id: 'DEVICE1',
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
        msc4354_sticky_key: 'memberA',
      },
      { stickyDurationMs: 3600000 },
    );

    await expect(joinedPromise).resolves.toEqual([
      {
        sessionId: 'vtdiVgWoeLb2NR7dph94uv/R4+U6uQTmCYE9Q0BlgUw',
        userId: '@user-id:example.com',
        memberId: 'memberA',
        livekitTransport: {
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
      },
    ]);

    expect(widgetApi.updateDelayedEvent).not.toHaveBeenCalledWith(
      'syd_wlGAStYmBRRdjnWiHSDA',
      UpdateDelayedEventAction.Cancel,
    );

    widgetApi.sendDelayedRoomEvent.mockResolvedValue({
      delay_id: 'qqq_bcooaGNyKtyFbIGjGMQR',
    });

    vi.advanceTimersByTime(3600000 * 0.99);

    await vi.waitFor(() =>
      expect(widgetApi.sendRoomEvent).toHaveBeenCalledTimes(2),
    );

    expect(widgetApi.sendRoomEvent).toHaveBeenNthCalledWith(
      2,
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id',
        member: {
          id: 'memberA',
          membership: 'join',
          device_id: 'DEVICE1',
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
        msc4354_sticky_key: 'memberA',
      },
      { stickyDurationMs: 3600000 },
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledWith(
      'syd_wlGAStYmBRRdjnWiHSDA',
      UpdateDelayedEventAction.Cancel,
    );

    vi.advanceTimersByTime(3600000 * 0.99);

    await vi.waitFor(() =>
      expect(widgetApi.sendRoomEvent).toHaveBeenCalledTimes(3),
    );

    expect(widgetApi.sendRoomEvent).toHaveBeenNthCalledWith(
      3,
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id',
        member: {
          id: 'memberA',
          membership: 'join',
          device_id: 'DEVICE1',
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
        msc4354_sticky_key: 'memberA',
      },
      { stickyDurationMs: 3600000 },
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledWith(
      'qqq_bcooaGNyKtyFbIGjGMQR',
      UpdateDelayedEventAction.Cancel,
    );
  });

  it('should restart a remove membership delayed sticky event if it is about to be sent', async () => {
    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendDelayedRoomEvent).toHaveBeenCalledWith(
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id',
        member: {
          id: 'memberA',
          membership: 'leave',
          device_id: 'DEVICE1',
        },
        leave_reason: {
          code: 'delayed_leave',
        },
        msc4354_sticky_key: 'memberA',
      },
      removeSessionDelay,
      { stickyDurationMs: 3600000 },
    );
    expect(widgetApi.updateDelayedEvent).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75 + 100);

    expect(widgetApi.updateDelayedEvent).toHaveBeenLastCalledWith(
      'syd_wlGAStYmBRRdjnWiHSDA',
      UpdateDelayedEventAction.Restart,
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75);

    expect(widgetApi.updateDelayedEvent).toHaveBeenLastCalledWith(
      'syd_wlGAStYmBRRdjnWiHSDA',
      UpdateDelayedEventAction.Restart,
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(2);
  });

  it('should stop to restart a remove membership delayed sticky event if restart failed', async () => {
    widgetApi.updateDelayedEvent.mockRejectedValue(new Error('Some error'));

    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendDelayedRoomEvent).toHaveBeenCalledWith(
      ROOM_EVENT_4143_RTC_MEMBER,
      {
        slot_id: 'net.nordeck.whiteboard#whiteboard-id',
        member: {
          id: 'memberA',
          membership: 'leave',
          device_id: 'DEVICE1',
        },
        leave_reason: {
          code: 'delayed_leave',
        },
        msc4354_sticky_key: 'memberA',
      },
      removeSessionDelay,
      { stickyDurationMs: 3600000 },
    );
    expect(widgetApi.updateDelayedEvent).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75 + 100);

    expect(widgetApi.updateDelayedEvent).toHaveBeenLastCalledWith(
      'syd_wlGAStYmBRRdjnWiHSDA',
      UpdateDelayedEventAction.Restart,
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75);

    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(1);
  });

  it('should handle joined members from history', async () => {
    // Send a leave event first and then join event
    widgetApi.mockSendRoomEvent(
      mockRtcMember({
        sender: '@another-user:example.com',
        content: mockRtcMemberLeaveContent(),
      }),
    );

    widgetApi.mockSendRoomEvent(
      mockRtcMember({
        sender: '@another-user:example.com',
      }),
    );

    // No leave event, a joined user
    widgetApi.mockSendRoomEvent(
      mockRtcMember({
        sender: '@another-user-id:example.com',
        content: mockRtcMemberJoinContent({
          deviceId: 'DEVICE2',
          memberId: 'memberB',
        }),
      }),
    );

    const joinedPromise = firstValueFrom(
      rtcSessionManager.observeSessionJoined().pipe(take(1), toArray()),
    );

    await rtcSessionManager.join('whiteboard-id');

    await expect(joinedPromise).resolves.toEqual([
      {
        sessionId: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
        userId: '@another-user-id:example.com',
        memberId: 'memberB',
        livekitTransport: {
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
      },
    ]);
  });

  it('should handle new members joining a whiteboard', async () => {
    const joinedPromise = firstValueFrom(
      rtcSessionManager.observeSessionJoined().pipe(take(2), toArray()),
    );

    await rtcSessionManager.join('whiteboard-id');

    widgetApi.mockSendRoomEvent(
      mockRtcMember({
        sender: '@another-user-id:example.com',
        content: mockRtcMemberJoinContent({
          deviceId: 'DEVICE2',
          memberId: 'memberB',
        }),
      }),
    );

    await expect(joinedPromise).resolves.toEqual([
      {
        sessionId: 'vtdiVgWoeLb2NR7dph94uv/R4+U6uQTmCYE9Q0BlgUw',
        userId: '@user-id:example.com',
        memberId: 'memberA',
        livekitTransport: {
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
      },
      {
        sessionId: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
        userId: '@another-user-id:example.com',
        memberId: 'memberB',
        livekitTransport: {
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
      },
    ]);
  });

  it('should handle members leaving a whiteboard', async () => {
    const joinedPromise = firstValueFrom(
      rtcSessionManager.observeSessionJoined().pipe(take(2), toArray()),
    );

    const leftPromise = firstValueFrom(
      rtcSessionManager.observeSessionLeft().pipe(take(1), toArray()),
    );

    await rtcSessionManager.join('whiteboard-id');

    widgetApi.mockSendRoomEvent(
      mockRtcMember({
        sender: '@another-user-id:example.com',
        content: mockRtcMemberJoinContent({
          deviceId: 'DEVICE2',
          memberId: 'memberB',
        }),
      }),
    );

    await expect(joinedPromise).resolves.toEqual([
      {
        sessionId: 'vtdiVgWoeLb2NR7dph94uv/R4+U6uQTmCYE9Q0BlgUw',
        userId: '@user-id:example.com',
        memberId: 'memberA',
        livekitTransport: {
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
      },
      {
        sessionId: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
        userId: '@another-user-id:example.com',
        memberId: 'memberB',
        livekitTransport: {
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
      },
    ]);

    // Unexpected user, no session
    widgetApi.mockSendRoomEvent(
      mockRtcMember({
        sender: '@unknown-user-id:example.com',
        content: mockRtcMemberLeaveContent({
          memberId: 'memberY',
          deviceId: 'DEVICE0',
        }),
      }),
    );
    // A joined user leaves
    widgetApi.mockSendRoomEvent(
      mockRtcMember({
        sender: '@another-user-id:example.com',
        content: mockRtcMemberLeaveContent({
          memberId: 'memberB',
          deviceId: 'DEVICE2',
        }),
      }),
    );

    await expect(leftPromise).resolves.toEqual([
      {
        sessionId: 'sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0',
        userId: '@another-user-id:example.com',
        memberId: 'memberB',
        livekitTransport: {
          livekitServiceUrl: 'https://livekit-jwt.example.com',
        },
      },
    ]);
  });

  it('should close observables', async () => {
    const joinedPromise = firstValueFrom(
      rtcSessionManager.observeSessionJoined().pipe(toArray()),
    );
    const leftPromise = firstValueFrom(
      rtcSessionManager.observeSessionLeft().pipe(toArray()),
    );

    rtcSessionManager.destroy();

    await expect(joinedPromise).resolves.toEqual([]);
    await expect(leftPromise).resolves.toEqual([]);
  });
});
