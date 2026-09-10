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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockRtcSlot } from '../../lib/testUtils/matrixTestUtils';
import { createStore } from '../store';
import { rtcSlotApi } from './rtcSlotApi';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getRtcSlots', () => {
  it('should return whiteboard rtc slots', async () => {
    const rtcSlot0 = widgetApi.mockSendStateEvent(
      mockRtcSlot({
        origin_server_ts: 5,
      }),
    );
    const rtcSlot1 = widgetApi.mockSendStateEvent(
      mockRtcSlot({
        whiteboardId: 'whiteboard-1',
        origin_server_ts: 4,
      }),
    );

    const store = createStore({ widgetApi });

    await expect(
      store.dispatch(rtcSlotApi.endpoints.getRtcSlots.initiate()).unwrap(),
    ).resolves.toEqual({
      entities: {
        [rtcSlot0.state_key]: rtcSlot0,
        [rtcSlot1.state_key]: rtcSlot1,
      },
      ids: [rtcSlot1.state_key, rtcSlot0.state_key],
    });
  });

  it('should handle missing whiteboard rtc slots', async () => {
    const store = createStore({ widgetApi });

    await expect(
      store.dispatch(rtcSlotApi.endpoints.getRtcSlots.initiate()).unwrap(),
    ).resolves.toEqual({ entities: {}, ids: [] });
  });

  it('should handle load errors', async () => {
    widgetApi.receiveStateEvents.mockRejectedValue(new Error('Some Error'));

    const store = createStore({ widgetApi });

    await expect(
      store.dispatch(rtcSlotApi.endpoints.getRtcSlots.initiate()).unwrap(),
    ).rejects.toEqual({
      message: 'Could not load whiteboard rtc slots: Some Error',
      name: 'LoadFailed',
    });
  });

  it('should observe whiteboard rtc slots', async () => {
    const store = createStore({ widgetApi });

    store.dispatch(rtcSlotApi.endpoints.getRtcSlots.initiate());

    await waitFor(() =>
      expect(
        rtcSlotApi.endpoints.getRtcSlots.select()(store.getState()).data,
      ).toEqual({ entities: {}, ids: [] }),
    );

    const rtcSlot = widgetApi.mockSendStateEvent(mockRtcSlot());

    await waitFor(() =>
      expect(
        rtcSlotApi.endpoints.getRtcSlots.select()(store.getState()).data,
      ).toEqual({
        entities: {
          [rtcSlot.state_key]: rtcSlot,
        },
        ids: [rtcSlot.state_key],
      }),
    );
  });

  it('should observe deletion of whiteboard rtc slots', async () => {
    const store = createStore({ widgetApi });
    const rtcSlot = widgetApi.mockSendStateEvent(mockRtcSlot());

    store.dispatch(rtcSlotApi.endpoints.getRtcSlots.initiate());

    await waitFor(() =>
      expect(
        rtcSlotApi.endpoints.getRtcSlots.select()(store.getState()).data,
      ).toEqual({
        entities: {
          [rtcSlot.state_key]: rtcSlot,
        },
        ids: [rtcSlot.state_key],
      }),
    );

    // Delete whiteboard
    widgetApi.mockSendStateEvent({
      type: 'org.matrix.msc4143.rtc.slot',
      sender: '@user-id:example.com',
      content: {},
      state_key: rtcSlot.state_key,
      origin_server_ts: 0,
      event_id: '$event-id-0',
      room_id: '!room-id:example.com',
    });

    await waitFor(() =>
      expect(
        rtcSlotApi.endpoints.getRtcSlots.select()(store.getState()).data,
      ).toEqual({ entities: {}, ids: [] }),
    );
  });
});

describe('updateRtcSlot', () => {
  it('should create rtc slot', async () => {
    const store = createStore({ widgetApi });
    const rtcSlot = mockRtcSlot().content;

    await expect(
      store
        .dispatch(
          rtcSlotApi.endpoints.updateRtcSlot.initiate({
            slotId: 'net.nordeck.whiteboard#whiteboard-0',
            content: rtcSlot,
          }),
        )
        .unwrap(),
    ).resolves.toEqual({
      event: expect.objectContaining({
        content: rtcSlot,
        state_key: 'net.nordeck.whiteboard#whiteboard-0',
      }),
    });

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      'org.matrix.msc4143.rtc.slot',
      rtcSlot,
      {
        stateKey: 'net.nordeck.whiteboard#whiteboard-0',
      },
    );
  });

  it('should reject on error', async () => {
    const store = createStore({ widgetApi });

    widgetApi.receiveStateEvents.mockRejectedValue(new Error('Some Error'));

    await expect(
      store
        .dispatch(
          rtcSlotApi.endpoints.updateRtcSlot.initiate({
            slotId: 'net.nordeck.whiteboard#whiteboard-0',
            content: mockRtcSlot().content,
          }),
        )
        .unwrap(),
    ).rejects.toEqual({
      name: 'UpdateFailed',
      message: 'Could not update whiteboard rtc slot: Some Error',
    });

    expect(widgetApi.sendStateEvent).not.toHaveBeenCalled();
  });
});
