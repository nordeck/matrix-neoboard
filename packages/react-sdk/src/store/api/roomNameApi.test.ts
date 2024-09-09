/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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
import { mockRoomName } from '../../lib/testUtils/matrixTestUtils';
import { createStore } from '../store';
import { roomNameApi } from './roomNameApi';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('getRoomName', () => {
  it('should return room name', async () => {
    const event = widgetApi.mockSendStateEvent(mockRoomName());

    const store = createStore({ widgetApi });

    await expect(
      store.dispatch(roomNameApi.endpoints.getRoomName.initiate()).unwrap(),
    ).resolves.toEqual({ event });
  });

  it('should handle missing room name', async () => {
    const store = createStore({ widgetApi });

    await expect(
      store.dispatch(roomNameApi.endpoints.getRoomName.initiate()).unwrap(),
    ).resolves.toEqual({ event: undefined });
  });

  it('should handle load errors', async () => {
    widgetApi.receiveStateEvents.mockRejectedValue(new Error('Some Error'));

    const store = createStore({ widgetApi });

    await expect(
      store.dispatch(roomNameApi.endpoints.getRoomName.initiate()).unwrap(),
    ).rejects.toEqual({
      message: 'Could not load room name: Some Error',
      name: 'LoadFailed',
    });
  });

  it('should observe room name', async () => {
    const store = createStore({ widgetApi });

    store.dispatch(roomNameApi.endpoints.getRoomName.initiate());

    await waitFor(() =>
      expect(
        roomNameApi.endpoints.getRoomName.select()(store.getState()).data,
      ).toEqual({ event: undefined }),
    );

    const event = widgetApi.mockSendStateEvent(mockRoomName());

    await waitFor(() =>
      expect(
        roomNameApi.endpoints.getRoomName.select()(store.getState()).data,
      ).toEqual({ event }),
    );
  });
});
