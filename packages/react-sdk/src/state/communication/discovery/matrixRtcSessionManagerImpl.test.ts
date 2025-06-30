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
import { UpdateDelayedEventAction } from 'matrix-widget-api';
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
  const removeSessionDelay = 8000;
  let widgetApi: MockedWidgetApi;
  let rtcSessionManager: MatrixRtcSessionManagerImpl;

  beforeEach(() => {
    vi.useFakeTimers();

    widgetApi = mockWidgetApi();
    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.userId = '@user-id';
    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.deviceId = 'DEVICEID';
    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.roomId = 'room-id';

    vi.stubEnv('REACT_APP_RTC', 'matrixrtc');

    rtcSessionManager = new MatrixRtcSessionManagerImpl(
      widgetApi,
      DEFAULT_RTC_EXPIRE_DURATION,
      removeSessionDelay,
    );

    // need to mock getWellKnownFoci to return a value
    vi.spyOn(matrixRtcFocus, 'getWellKnownFoci').mockResolvedValue([
      {
        type: 'livekit',
        livekit_service_url: 'https://livekit.example.com',
      },
    ]);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();

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
        expires: expect.any(Number),
        foci_preferred: expect.any(Array),
        focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
        scope: 'm.room',
      },
      { stateKey: '_@user-id_DEVICEID' },
    );
    expect(widgetApi.sendDelayedStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {},
      removeSessionDelay,
      { stateKey: '_@user-id_DEVICEID' },
    );
    expect(rtcSessionManager.getRemoveSessionDelayId()).toEqual(
      'syd_bcooaGNyKtyFbIGjGMQR',
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
        expires: expect.any(Number),
        foci_preferred: expect.any(Array),
        focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
        scope: 'm.room',
      },
      { stateKey: '_@user-id_DEVICEID' },
    );
    expect(widgetApi.sendDelayedStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {},
      removeSessionDelay,
      { stateKey: '_@user-id_DEVICEID' },
    );

    widgetApi.sendDelayedStateEvent.mockResolvedValue({
      delay_id: 'qqq_bcooaGNyKtyFbIGjGMQR',
    });

    await rtcSessionManager.join('whiteboard-id-1');

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {},
      { stateKey: '_@user-id_DEVICEID' },
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledWith(
      'syd_bcooaGNyKtyFbIGjGMQR',
      UpdateDelayedEventAction.Cancel,
    );

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {
        application: RTC_APPLICATION_WHITEBOARD,
        call_id: 'whiteboard-id-1',
        device_id: 'DEVICEID',
        expires: expect.any(Number),
        foci_preferred: expect.any(Array),
        focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
        scope: 'm.room',
      },
      { stateKey: '_@user-id_DEVICEID' },
    );
    expect(widgetApi.sendDelayedStateEvent).toHaveBeenNthCalledWith(
      2,
      STATE_EVENT_RTC_MEMBER,
      {},
      removeSessionDelay,
      { stateKey: '_@user-id_DEVICEID' },
    );
    expect(rtcSessionManager.getRemoveSessionDelayId()).toEqual(
      'qqq_bcooaGNyKtyFbIGjGMQR',
    );
  });

  it('should join the same whiteboard', async () => {
    const { sessionId } = await rtcSessionManager.join('whiteboard-id');

    expect(sessionId).toEqual(expect.any(String));
    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
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
    expect(widgetApi.sendDelayedStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {},
      removeSessionDelay,
      { stateKey: '_@user-id_DEVICEID' },
    );

    widgetApi.sendDelayedStateEvent.mockResolvedValue({
      delay_id: 'qqq_bcooaGNyKtyFbIGjGMQR',
    });

    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendStateEvent).toHaveBeenNthCalledWith(
      2,
      STATE_EVENT_RTC_MEMBER,
      {},
      { stateKey: '_@user-id_DEVICEID' },
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledWith(
      'syd_bcooaGNyKtyFbIGjGMQR',
      UpdateDelayedEventAction.Cancel,
    );

    expect(widgetApi.sendStateEvent).toHaveBeenNthCalledWith(
      3,
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
    expect(widgetApi.sendDelayedStateEvent).toHaveBeenNthCalledWith(
      2,
      STATE_EVENT_RTC_MEMBER,
      {},
      removeSessionDelay,
      { stateKey: '_@user-id_DEVICEID' },
    );
    expect(rtcSessionManager.getRemoveSessionDelayId()).toEqual(
      'qqq_bcooaGNyKtyFbIGjGMQR',
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
        expires: expect.any(Number),
        foci_preferred: expect.any(Array),
        focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
        scope: 'm.room',
      },
      { stateKey: '_@user-id_DEVICEID' },
    );
    expect(widgetApi.sendDelayedStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {},
      removeSessionDelay,
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
        expires: expect.any(Number),
        foci_preferred: expect.any(Array),
        focus_active: { type: 'livekit', focus_selection: 'oldest_membership' },
        scope: 'm.room',
      },
      { stateKey: '_@user-id_OTHERDEVICEID' },
    );
    expect(widgetApi.sendDelayedStateEvent).toHaveBeenNthCalledWith(
      2,
      STATE_EVENT_RTC_MEMBER,
      {},
      removeSessionDelay,
      { stateKey: '_@user-id_OTHERDEVICEID' },
    );
    expect(rtcSessionManager.getRemoveSessionDelayId()).toEqual(
      'syd_bcooaGNyKtyFbIGjGMQR',
    );
  });

  it('should update membership if it is about to expire', async () => {
    const expectedExpires = Date.now() + DEFAULT_RTC_EXPIRE_DURATION;
    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendStateEvent).toHaveBeenNthCalledWith(
      1,
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
      expect(widgetApi.sendStateEvent).toHaveBeenCalledTimes(2),
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
      .calls[1][1] as RTCSessionEventContent;
    expect(lastCall.expires).toBeGreaterThan(expectedExpires);
  });

  it('should restart a remove membership delayed event if it is about to be sent', async () => {
    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendDelayedStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {},
      removeSessionDelay,
      { stateKey: '_@user-id_DEVICEID' },
    );
    expect(widgetApi.updateDelayedEvent).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75 + 100);

    expect(widgetApi.updateDelayedEvent).toHaveBeenLastCalledWith(
      'syd_bcooaGNyKtyFbIGjGMQR',
      UpdateDelayedEventAction.Restart,
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75);

    expect(widgetApi.updateDelayedEvent).toHaveBeenLastCalledWith(
      'syd_bcooaGNyKtyFbIGjGMQR',
      UpdateDelayedEventAction.Restart,
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(2);
  });

  it('should stop to restart a remove membership delayed event if restart failed', async () => {
    widgetApi.updateDelayedEvent.mockRejectedValue(new Error('Some error'));

    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendDelayedStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {},
      removeSessionDelay,
      { stateKey: '_@user-id_DEVICEID' },
    );
    expect(widgetApi.updateDelayedEvent).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75 + 100);

    expect(widgetApi.updateDelayedEvent).toHaveBeenLastCalledWith(
      'syd_bcooaGNyKtyFbIGjGMQR',
      UpdateDelayedEventAction.Restart,
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75);

    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(1);
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
          expires: 123456789,
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

  it('should update membership when own membership is removed by user himself', async () => {
    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
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
    expect(widgetApi.sendDelayedStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {},
      removeSessionDelay,
      { stateKey: '_@user-id_DEVICEID' },
    );

    expect(widgetApi.sendDelayedStateEvent).toHaveBeenCalledTimes(1);

    widgetApi.mockSendStateEvent(
      mockWhiteboardMembership(
        {
          state_key: '_@user-id_DEVICEID',
          content: {},
        },
        true,
      ),
    );

    await vi.waitFor(() =>
      expect(widgetApi.sendStateEvent).toHaveBeenNthCalledWith(
        2,
        STATE_EVENT_RTC_MEMBER,
        {
          application: RTC_APPLICATION_WHITEBOARD,
          call_id: 'whiteboard-id',
          device_id: 'DEVICEID',
          expires: expect.any(Number),
          foci_preferred: expect.any(Array),
          focus_active: {
            type: 'livekit',
            focus_selection: 'oldest_membership',
          },
          scope: 'm.room',
        },
        { stateKey: '_@user-id_DEVICEID' },
      ),
    );

    expect(widgetApi.sendDelayedStateEvent).toHaveBeenCalledTimes(1);
  });

  it('should update membership and reschedule remove membership delayed event when membership is removed by another user', async () => {
    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
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
    expect(widgetApi.sendDelayedStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {},
      removeSessionDelay,
      { stateKey: '_@user-id_DEVICEID' },
    );

    widgetApi.sendDelayedStateEvent.mockResolvedValue({
      delay_id: 'qqq_bcooaGNyKtyFbIGjGMQR',
    });
    widgetApi.updateDelayedEvent.mockImplementation((delayId) => {
      if (delayId === 'syd_bcooaGNyKtyFbIGjGMQR') {
        // Throw an error if a previous delay_id is passed
        throw new Error('Cannot find a delayed event');
      } else {
        return Promise.resolve();
      }
    });

    // Use another user to send empty member event, according to MSC4140 this will cancel a more recent state event.
    widgetApi.mockSendStateEvent(
      mockWhiteboardMembership(
        {
          state_key: '_@user-id_DEVICEID',
          content: {},
          sender: '@another-user-id',
        },
        true,
      ),
    );

    await vi.waitFor(() =>
      expect(widgetApi.sendStateEvent).toHaveBeenNthCalledWith(
        2,
        STATE_EVENT_RTC_MEMBER,
        {
          application: RTC_APPLICATION_WHITEBOARD,
          call_id: 'whiteboard-id',
          device_id: 'DEVICEID',
          expires: expect.any(Number),
          foci_preferred: expect.any(Array),
          focus_active: {
            type: 'livekit',
            focus_selection: 'oldest_membership',
          },
          scope: 'm.room',
        },
        { stateKey: '_@user-id_DEVICEID' },
      ),
    );

    expect(widgetApi.sendDelayedStateEvent).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75 + 100);

    // This refresh request will fail and get cancelled
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledWith(
      'syd_bcooaGNyKtyFbIGjGMQR',
      UpdateDelayedEventAction.Restart,
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledWith(
      'qqq_bcooaGNyKtyFbIGjGMQR',
      UpdateDelayedEventAction.Restart,
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(2);
    expect(rtcSessionManager.getRemoveSessionDelayId()).toEqual(
      'qqq_bcooaGNyKtyFbIGjGMQR',
    );

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75);

    expect(widgetApi.updateDelayedEvent).toHaveBeenLastCalledWith(
      'qqq_bcooaGNyKtyFbIGjGMQR',
      UpdateDelayedEventAction.Restart,
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(3);
  });

  it('should update membership and reschedule remove membership delayed event when failed to restart membership delayed event and own membership is removed', async () => {
    widgetApi.updateDelayedEvent.mockRejectedValue(new Error('Some error'));

    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendDelayedStateEvent).toHaveBeenCalledWith(
      STATE_EVENT_RTC_MEMBER,
      {},
      removeSessionDelay,
      { stateKey: '_@user-id_DEVICEID' },
    );
    expect(widgetApi.updateDelayedEvent).not.toHaveBeenCalled();
    expect(rtcSessionManager.getRemoveSessionDelayId()).toEqual(
      'syd_bcooaGNyKtyFbIGjGMQR',
    );

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75 + 100);

    expect(widgetApi.updateDelayedEvent).toHaveBeenLastCalledWith(
      'syd_bcooaGNyKtyFbIGjGMQR',
      UpdateDelayedEventAction.Restart,
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(1);
    expect(rtcSessionManager.getRemoveSessionDelayId()).toBeUndefined();

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75);

    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(1);

    widgetApi.updateDelayedEvent.mockResolvedValue(undefined);
    widgetApi.sendDelayedStateEvent.mockResolvedValue({
      delay_id: 'qqq_bcooaGNyKtyFbIGjGMQR',
    });

    widgetApi.mockSendStateEvent(
      mockWhiteboardMembership(
        {
          state_key: '_@user-id_DEVICEID',
          content: {},
        },
        true,
      ),
    );

    await vi.waitFor(() =>
      expect(widgetApi.sendStateEvent).toHaveBeenNthCalledWith(
        2,
        STATE_EVENT_RTC_MEMBER,
        {
          application: RTC_APPLICATION_WHITEBOARD,
          call_id: 'whiteboard-id',
          device_id: 'DEVICEID',
          expires: expect.any(Number),
          foci_preferred: expect.any(Array),
          focus_active: {
            type: 'livekit',
            focus_selection: 'oldest_membership',
          },
          scope: 'm.room',
        },
        { stateKey: '_@user-id_DEVICEID' },
      ),
    );

    expect(widgetApi.sendDelayedStateEvent).toHaveBeenCalledTimes(2);
    expect(rtcSessionManager.getRemoveSessionDelayId()).toEqual(
      'qqq_bcooaGNyKtyFbIGjGMQR',
    );

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75 + 100);

    expect(widgetApi.updateDelayedEvent).toHaveBeenLastCalledWith(
      'qqq_bcooaGNyKtyFbIGjGMQR',
      UpdateDelayedEventAction.Restart,
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(removeSessionDelay * 0.75);

    expect(widgetApi.updateDelayedEvent).toHaveBeenLastCalledWith(
      'qqq_bcooaGNyKtyFbIGjGMQR',
      UpdateDelayedEventAction.Restart,
    );
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledTimes(3);
  });

  it('should remove membership when leaving', async () => {
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
    expect(widgetApi.updateDelayedEvent).toHaveBeenCalledWith(
      'syd_bcooaGNyKtyFbIGjGMQR',
      UpdateDelayedEventAction.Cancel,
    );
    expect(rtcSessionManager.getRemoveSessionDelayId()).toBeUndefined();
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

  it('should set membership with preferred foci when joining a session', async () => {
    await rtcSessionManager.join('whiteboard-id');

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

  it('should re-join and update session with new foci if they change', async () => {
    await rtcSessionManager.join('whiteboard-id');

    widgetApi.sendStateEvent.mockClear();

    // Simulate a foci change
    vi.spyOn(matrixRtcFocus, 'getWellKnownFoci').mockResolvedValue([
      {
        type: 'livekit',
        livekit_service_url: 'https://new-livekit.example.com',
      },
    ]);

    // default well known foci polling is 60 seconds
    vi.advanceTimersByTime(60 * 1000 + 500);

    const activeFocusPromise = firstValueFrom(
      rtcSessionManager.observeActiveFocus().pipe(take(1)),
    );

    // Verify the focus update was emitted
    await expect(activeFocusPromise).resolves.toEqual({
      type: 'livekit',
      livekit_service_url: 'https://new-livekit.example.com',
    });

    // Verify the active focus was updated
    expect(rtcSessionManager.getActiveFocus()).toEqual({
      type: 'livekit',
      livekit_service_url: 'https://new-livekit.example.com',
    });

    // re-join the session to trigger the foci update
    await rtcSessionManager.join('whiteboard-id');

    expect(widgetApi.sendStateEvent).toHaveBeenCalledTimes(2);

    const firstCall = widgetApi.sendStateEvent.mock.calls[0];
    // expect content to be empty for the first call
    expect(firstCall[1]).toEqual({});

    const secondCall = widgetApi.sendStateEvent.mock.calls[1];
    // expect content to contain the new foci for the second call
    expect(secondCall[1]).toEqual(
      expect.objectContaining({
        foci_preferred: [
          {
            type: 'livekit',
            livekit_service_url: 'https://new-livekit.example.com',
            livekit_alias: 'room-id',
          },
        ],
      }),
    );
  });

  it('should not trigger focus update if the active focus is the same', async () => {
    await rtcSessionManager.join('whiteboard-id');

    // Simulate a foci change
    vi.spyOn(matrixRtcFocus, 'getWellKnownFoci').mockResolvedValue([
      {
        type: 'livekit',
        livekit_service_url: 'https://livekit.example.com',
      },
    ]);

    // default well known foci polling is 60 seconds
    vi.advanceTimersByTime(60 * 1000 + 500);

    // Verify that no focus update was done
    expect(rtcSessionManager.getActiveFocus()).toEqual({
      type: 'livekit',
      livekit_service_url: 'https://livekit.example.com',
    });
  });

  it('should use member focus when joining ongoing session', async () => {
    await rtcSessionManager.join('whiteboard-id');

    widgetApi.sendStateEvent.mockClear();

    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.deviceId = 'OTHERDEVICEID';
    const otherSessionManager = new MatrixRtcSessionManagerImpl(widgetApi);

    // return a different value for this other session manager
    vi.spyOn(matrixRtcFocus, 'getWellKnownFoci').mockResolvedValue([
      {
        type: 'livekit',
        livekit_service_url: 'https://other.livekit.example.com',
      },
    ]);

    await otherSessionManager.join('whiteboard-id');

    expect(
      matrixRtcFocus.isEqualFocus(otherSessionManager.getActiveFocus(), {
        type: 'livekit',
        livekit_service_url: 'https://livekit.example.com',
      }),
    ).toEqual(true);
  });

  it('should change active focus when oldest member leaves', async () => {
    await rtcSessionManager.join('whiteboard-id');

    // return a different value for this other session manager
    vi.spyOn(matrixRtcFocus, 'getWellKnownFoci').mockResolvedValue([
      {
        type: 'livekit',
        livekit_service_url: 'https://other.livekit.example.com',
      },
    ]);

    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.userId = '@another-user-id';
    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.deviceId = 'OTHERDEVICEID';
    const otherSessionManager = new MatrixRtcSessionManagerImpl(widgetApi);

    const activeFocusPromise = firstValueFrom(
      otherSessionManager.observeActiveFocus().pipe(take(1)),
    );

    await expect(activeFocusPromise).resolves.toEqual({
      type: 'livekit',
      livekit_service_url: 'https://livekit.example.com',
      livekit_alias: 'room-id',
    });

    await otherSessionManager.join('whiteboard-id');

    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.userId = '@user-id';
    // @ts-ignore forcefully set for tests
    widgetApi.widgetParameters.deviceId = 'DEVICEID';
    await rtcSessionManager.leave();

    // Verify the active focus was updated
    expect(otherSessionManager.getActiveFocus()).toEqual({
      type: 'livekit',
      livekit_service_url: 'https://other.livekit.example.com',
    });
  });
});
