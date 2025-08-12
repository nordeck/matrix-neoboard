/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  mockPowerLevelsEvent,
  mockRoomVersion11CreateEvent,
} from '../../lib/testUtils/matrixTestUtils';
import { createStore } from '../store';
import { powerLevelsApi } from './powerLevelsApi';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('getPowerLevels', () => {
  it('should return no power levels if state event is missing', async () => {
    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(powerLevelsApi.endpoints.getPowerLevels.initiate())
        .unwrap(),
    ).resolves.toEqual({ event: undefined });
  });

  it('should return power levels', async () => {
    widgetApi.mockSendStateEvent(mockPowerLevelsEvent());

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(powerLevelsApi.endpoints.getPowerLevels.initiate())
        .unwrap(),
    ).resolves.toEqual({
      event: expect.objectContaining({
        content: {
          users_default: 100,
        },
      }),
    });
  });

  it('should handle load errors', async () => {
    widgetApi.receiveStateEvents.mockRejectedValue(new Error('Some Error'));

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(powerLevelsApi.endpoints.getPowerLevels.initiate())
        .unwrap(),
    ).rejects.toEqual({
      message: 'Could not load power levels: Some Error',
      name: 'LoadFailed',
    });
  });

  it('should observe power levels', async () => {
    widgetApi.mockSendStateEvent(mockPowerLevelsEvent());

    const store = createStore({ widgetApi });

    store.dispatch(powerLevelsApi.endpoints.getPowerLevels.initiate());

    await waitFor(() =>
      expect(
        powerLevelsApi.endpoints.getPowerLevels.select()(store.getState()).data,
      ).toEqual({
        event: expect.objectContaining({
          content: {
            users_default: 100,
          },
        }),
      }),
    );

    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({ content: { users_default: 50 } }),
    );

    await waitFor(() =>
      expect(
        powerLevelsApi.endpoints.getPowerLevels.select()(store.getState()).data,
      ).toEqual({
        event: expect.objectContaining({
          content: {
            users_default: 50,
          },
        }),
      }),
    );
  });
});

describe('getCreateEvent', () => {
  it('should return no create event if state event is missing', async () => {
    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(powerLevelsApi.endpoints.getCreateEvent.initiate())
        .unwrap(),
    ).resolves.toEqual({ event: undefined });
  });

  it('should return create event', async () => {
    widgetApi.mockSendStateEvent(mockRoomVersion11CreateEvent());

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(powerLevelsApi.endpoints.getCreateEvent.initiate())
        .unwrap(),
    ).resolves.toEqual({
      event: expect.objectContaining({
        content: {
          room_version: '11',
        },
      }),
    });
  });

  it('should handle load errors', async () => {
    widgetApi.receiveStateEvents.mockRejectedValue(new Error('Some Error'));

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(powerLevelsApi.endpoints.getCreateEvent.initiate())
        .unwrap(),
    ).rejects.toEqual({
      message: 'Could not load create event: Some Error',
      name: 'LoadFailed',
    });
  });

  it('should observe create event', async () => {
    widgetApi.mockSendStateEvent(mockRoomVersion11CreateEvent());

    const store = createStore({ widgetApi });

    store.dispatch(powerLevelsApi.endpoints.getCreateEvent.initiate());

    await waitFor(() =>
      expect(
        powerLevelsApi.endpoints.getCreateEvent.select()(store.getState()).data,
      ).toEqual({
        event: expect.objectContaining({
          content: {
            room_version: '11',
          },
        }),
      }),
    );

    widgetApi.mockSendStateEvent(
      mockRoomVersion11CreateEvent({
        content: {
          // @ts-expect-error - We explicitly add mock data here which is not part of the type
          extra: 'mock',
        },
      }),
    );

    await waitFor(() =>
      expect(
        powerLevelsApi.endpoints.getCreateEvent.select()(store.getState()).data,
      ).toEqual({
        event: expect.objectContaining({
          content: {
            room_version: '11',
            extra: 'mock',
          },
        }),
      }),
    );
  });
});

describe('patchPowerLevels', () => {
  it('should patch power levels event in current room', async () => {
    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          users: { '@user-id:example.com': 100 },
          users_default: 100,
        },
      }),
    );

    const store = createStore({ widgetApi });

    await store.dispatch(
      powerLevelsApi.endpoints.patchPowerLevels.initiate({
        changes: { users_default: 0, events_default: 0 },
      }),
    );

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      'm.room.power_levels',
      {
        users: { '@user-id:example.com': 100 },
        users_default: 0,
        events_default: 0,
      },
    );
  });

  it('should be idempotent', async () => {
    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          users: { '@user-id:example.com': 100 },
          users_default: 100,
        },
      }),
    );

    const store = createStore({ widgetApi });

    await store.dispatch(
      powerLevelsApi.endpoints.patchPowerLevels.initiate({
        changes: { users_default: 100 },
      }),
    );

    expect(widgetApi.sendStateEvent).not.toHaveBeenCalled();
  });
});
