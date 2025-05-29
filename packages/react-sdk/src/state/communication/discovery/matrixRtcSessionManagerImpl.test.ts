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
import { firstValueFrom, take, toArray } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockWhiteboardMembership } from '../../../lib/testUtils/matrixRtcMock';
import { STATE_EVENT_RTC_MEMBER } from '../../../model';
import {
  DEFAULT_RTC_EXPIRE_DURATION,
  RTC_APPLICATION_WHITEBOARD,
  RTCSessionEventContent,
} from '../../../model/matrixRtcSessions';
import * as matrixRtcFocus from './matrixRtcFocus';
import { MatrixRtcSessionManagerImpl } from './matrixRtcSessionManagerImpl';

describe('MatrixRtcSessionManagerImpl', () => {
  const fixedDate = 1742832000;
  let expectedExpires: number;
  let widgetApi: MockedWidgetApi;
  let rtcSessionManager: MatrixRtcSessionManagerImpl;

  beforeEach(() => {
    widgetApi = mockWidgetApi();
    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.userId = '@user-id';
    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.deviceId = 'DEVICEID';
    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.roomId = 'room-id';

    vi.stubEnv('REACT_APP_RTC', 'matrixrtc');
    vi.spyOn(Date, 'now').mockImplementation(() => fixedDate);
    expectedExpires = fixedDate + DEFAULT_RTC_EXPIRE_DURATION;

    rtcSessionManager = new MatrixRtcSessionManagerImpl(widgetApi);

    vi.spyOn(matrixRtcFocus, 'makePreferredLivekitFoci').mockImplementation(
      async (_domain: string | undefined, _livekitAlias: string) => {
        return [
          {
            type: 'livekit',
            livekit_service_url: 'https://livekit.example.com',
            livekit_alias: 'room-id',
          },
        ];
      },
    );
  });

  afterEach(() => {
    vi.spyOn(Date, 'now').mockRestore();
    vi.unstubAllEnvs();

    widgetApi.stop();
  });

  it('should join a whiteboard', async () => {
    const { sessionId } = await rtcSessionManager.join('whiteboard-id');

    expect(sessionId).toEqual(expect.any(String));
    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {
        application: RTC_APPLICATION_WHITEBOARD,
        call_id: 'whiteboard-id',
        device_id: 'DEVICEID',
        expires: expectedExpires,
        foci_preferred: expect.any(Array),
        focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
        scope: 'm.room',
      },
      { stateKey: '_@user-id_DEVICEID' },
    );
    expect(rtcSessionManager.getSessions()).toEqual([
      {
        sessionId: sessionId,
        userId: '@user-id',
      },
    ]);
  });

  it('should join another whiteboard', async () => {
    await rtcSessionManager.join('whiteboard-id-0');

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {
        application: RTC_APPLICATION_WHITEBOARD,
        call_id: 'whiteboard-id-0',
        device_id: 'DEVICEID',
        expires: expectedExpires,
        foci_preferred: expect.any(Array),
        focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
        scope: 'm.room',
      },
      { stateKey: '_@user-id_DEVICEID' },
    );

    await rtcSessionManager.join('whiteboard-id-1');

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {},
      { stateKey: '_@user-id_DEVICEID' },
    );

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {
        application: RTC_APPLICATION_WHITEBOARD,
        call_id: 'whiteboard-id-1',
        device_id: 'DEVICEID',
        expires: expectedExpires,
        foci_preferred: expect.any(Array),
        focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
        scope: 'm.room',
      },
      { stateKey: '_@user-id_DEVICEID' },
    );
  });

  it('should create a new membership when joining from a new device', async () => {
    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {
        application: RTC_APPLICATION_WHITEBOARD,
        call_id: 'whiteboard-id',
        device_id: 'DEVICEID',
        expires: expectedExpires,
        foci_preferred: expect.any(Array),
        focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
        scope: 'm.room',
      },
      { stateKey: '_@user-id_DEVICEID' },
    );

    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.deviceId = 'OTHERDEVICEID';
    const otherRtcSessionManager = new MatrixRtcSessionManagerImpl(widgetApi);

    await otherRtcSessionManager.join('whiteboard-id');
    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {
        application: RTC_APPLICATION_WHITEBOARD,
        call_id: 'whiteboard-id',
        device_id: 'OTHERDEVICEID',
        expires: expectedExpires,
        foci_preferred: expect.any(Array),
        focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
        scope: 'm.room',
      },
      { stateKey: '_@user-id_OTHERDEVICEID' },
    );
  });

  it('should update membership if it is about to expire', async () => {
    vi.spyOn(Date, 'now').mockRestore();
    vi.useFakeTimers();

    const fakeTime = new Date('2023-02-01T10:11:12.345Z');
    const expectedExpires = fakeTime.getTime() + DEFAULT_RTC_EXPIRE_DURATION;

    vi.setSystemTime(fakeTime);

    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendStateEvent).toHaveBeenNthCalledWith(
      2,
      STATE_EVENT_RTC_MEMBER,
      {
        application: RTC_APPLICATION_WHITEBOARD,
        call_id: 'whiteboard-id',
        device_id: 'DEVICEID',
        expires: expectedExpires,
        foci_preferred: expect.any(Array),
        focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
        scope: 'm.room',
      },
      { stateKey: '_@user-id_DEVICEID' },
    );

    vi.advanceTimersByTime(DEFAULT_RTC_EXPIRE_DURATION * 0.8);

    await vi.waitFor(() =>
      expect(widgetApi.sendStateEvent).toHaveBeenCalledTimes(3),
    );

    expect(widgetApi.sendStateEvent).toHaveBeenNthCalledWith(
      2,
      STATE_EVENT_RTC_MEMBER,
      {
        application: RTC_APPLICATION_WHITEBOARD,
        call_id: 'whiteboard-id',
        device_id: 'DEVICEID',
        expires: expect.any(Number),
        foci_preferred: expect.any(Array),
        focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
        scope: 'm.room',
      },
      { stateKey: '_@user-id_DEVICEID' },
    );

    // Check separately that the expires value is greater than expected
    const lastCall = widgetApi.sendStateEvent.mock
      .calls[2][1] as RTCSessionEventContent;
    expect(lastCall.expires).toBeGreaterThan(expectedExpires);
  });

  it('should handle new members joining a whiteboard', async () => {
    await rtcSessionManager.join('whiteboard-id');

    const joinedPromise = firstValueFrom(
      rtcSessionManager.observeSessionJoined().pipe(take(1), toArray()),
    );

    widgetApi.mockSendStateEvent(
      mockWhiteboardMembership({
        content: {
          call_id: 'whiteboard-id',
          scope: 'm.room',
          application: RTC_APPLICATION_WHITEBOARD,
          device_id: 'ANOTHERDEVICEID',
          expires: expectedExpires,
          foci_preferred: [],
          focus_active: {
            type: 'livekit',
            focus_selection: 'oldest_membership',
          },
        },
        state_key: '_@another-user_ANOTHERDEVICEID',
        sender: '@another-user',
      }),
    );

    await expect(joinedPromise).resolves.toEqual([
      { sessionId: '_@another-user_ANOTHERDEVICEID', userId: '@another-user' },
    ]);
  });

  it('should handle members leaving a whiteboard', async () => {
    const leftPromise = firstValueFrom(
      rtcSessionManager.observeSessionLeft().pipe(take(1), toArray()),
    );

    widgetApi.mockSendStateEvent(
      mockWhiteboardMembership({
        content: {
          device_id: 'ANOTHERDEVICEID',
          expires: expectedExpires,
        },
        state_key: '_@another-user_ANOTHERDEVICEID',
      }),
    );

    await rtcSessionManager.join('whiteboard-id');

    widgetApi.mockSendStateEvent(
      mockWhiteboardMembership(
        {
          state_key: '_@another-user_ANOTHERDEVICEID',
          content: {},
        },
        true,
      ),
    );

    await expect(leftPromise).resolves.toEqual([
      { sessionId: '_@another-user_ANOTHERDEVICEID', userId: '@user-id' },
    ]);
  });

  it('should leave a whiteboard', async () => {
    await rtcSessionManager.join('whiteboard-id');

    const leftPromise = firstValueFrom(
      rtcSessionManager.observeSessionLeft().pipe(take(1), toArray()),
    );

    await rtcSessionManager.leave();

    await expect(leftPromise).resolves.toEqual([
      { sessionId: '_@user-id_DEVICEID', userId: '@user-id' },
    ]);

    expect(rtcSessionManager.getSessions()).toEqual([]);
    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {},
      { stateKey: '_@user-id_DEVICEID' },
    );
  });

  it('should close observables', async () => {
    const joinedPromise = firstValueFrom(
      rtcSessionManager.observeSessionJoined().pipe(toArray()),
    );
    const leftPromise = firstValueFrom(
      rtcSessionManager.observeSessionJoined().pipe(toArray()),
    );

    rtcSessionManager.destroy();

    await expect(joinedPromise).resolves.toEqual([]);
    await expect(leftPromise).resolves.toEqual([]);
  });

  it('should fetch and emit LiveKit foci on initialization', async () => {
    const fociPromise = firstValueFrom(
      rtcSessionManager.observeFoci().pipe(take(1), toArray()),
    );

    await rtcSessionManager.join('whiteboard-id');

    await expect(fociPromise).resolves.toEqual([
      [
        {
          type: 'livekit',
          livekit_service_url: 'https://livekit.example.com',
          livekit_alias: 'room-id',
        },
      ],
    ]);
  });

  it('should update the membership when LiveKit foci are discovered', async () => {
    const fociPromise = firstValueFrom(
      rtcSessionManager.observeFoci().pipe(take(1), toArray()),
    );

    await rtcSessionManager.join('whiteboard-id');

    await expect(fociPromise).resolves.toEqual([
      [
        {
          type: 'livekit',
          livekit_service_url: 'https://livekit.example.com',
          livekit_alias: 'room-id',
        },
      ],
    ]);

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      expect.objectContaining({
        foci_preferred: [
          {
            type: 'livekit',
            livekit_service_url: 'https://livekit.example.com',
            livekit_alias: 'room-id',
          },
        ],
      }),
      expect.any(Object),
    );
  });

  it('should update session with new foci when they change', async () => {
    await rtcSessionManager.join('whiteboard-id');

    widgetApi.sendStateEvent.mockClear();

    const fociPromise = firstValueFrom(
      rtcSessionManager.observeFoci().pipe(take(1)),
    );

    // Simulate a foci change
    vi.spyOn(matrixRtcFocus, 'makePreferredLivekitFoci').mockImplementationOnce(
      async () => {
        return [
          {
            type: 'livekit',
            livekit_service_url: 'https://new-livekit.example.com',
            livekit_alias: 'room-id',
          },
        ];
      },
    );

    // Manually trigger an update (instead of waiting for the polling interval)
    // @ts-ignore: access private method for testing
    rtcSessionManager.updateLivekitFoci();

    // Verify the foci update is emitted
    await expect(fociPromise).resolves.toEqual([
      {
        type: 'livekit',
        livekit_service_url: 'https://new-livekit.example.com',
        livekit_alias: 'room-id',
      },
    ]);

    // Verify the session is updated with the new foci
    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      expect.objectContaining({
        foci_preferred: [
          {
            type: 'livekit',
            livekit_service_url: 'https://new-livekit.example.com',
            livekit_alias: 'room-id',
          },
        ],
      }),
      expect.any(Object),
    );
  });
});
