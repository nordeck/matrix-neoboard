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

import { RoomEvent } from '@matrix-widget-toolkit/api';
import { WidgetApiMockProvider } from '@matrix-widget-toolkit/react';
import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { renderHook } from '@testing-library/react-hooks';
import { ComponentType, PropsWithChildren, useState } from 'react';
import { Provider } from 'react-redux';
import {
  mockDocumentCreate,
  mockPowerLevelsEvent,
  mockWhiteboard,
} from '../lib/testUtils/matrixTestUtils';
import { createStore } from '../store';
import { useOwnedWhiteboard } from './useOwnedWhiteboard';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('useOwnedWhiteboard', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    Wrapper = ({ children }) => {
      const [store] = useState(() => createStore({ widgetApi }));
      return (
        <WidgetApiMockProvider value={widgetApi}>
          <Provider store={store}>{children}</Provider>
        </WidgetApiMockProvider>
      );
    };
  });

  it('should return an existing whiteboard', async () => {
    widgetApi.mockSendStateEvent(mockPowerLevelsEvent());

    const whiteboard = widgetApi.mockSendStateEvent(mockWhiteboard());

    const { result, waitForNextUpdate } = renderHook(
      () => useOwnedWhiteboard(),
      { wrapper: Wrapper },
    );

    expect(result.current).toEqual({ loading: true });

    await waitForNextUpdate();

    expect(result.current).toEqual({
      loading: false,
      value: {
        type: 'whiteboard',
        event: whiteboard,
      },
    });
  });

  it('should create a new whiteboard', async () => {
    widgetApi.mockSendStateEvent(mockPowerLevelsEvent());

    const { result, waitForNextUpdate } = renderHook(
      () => useOwnedWhiteboard(),
      { wrapper: Wrapper },
    );

    expect(result.current).toEqual({ loading: true });

    await waitForNextUpdate();

    expect(widgetApi.sendStateEvent).toBeCalledWith('m.room.power_levels', {
      events: { 'net.nordeck.whiteboard.sessions': 0 },
      users_default: 100,
    });

    expect(widgetApi.sendRoomEvent).toBeCalledWith(
      'net.nordeck.whiteboard.document.create',
      {},
    );

    const documentId = await widgetApi.sendRoomEvent.mock.results[0].value.then(
      (e: RoomEvent) => e.event_id,
    );

    expect(widgetApi.sendStateEvent).toBeCalledWith(
      'net.nordeck.whiteboard',
      { documentId },
      { stateKey: 'widget-id' },
    );

    expect(result.current).toEqual({
      loading: false,
      value: {
        type: 'whiteboard',
        event: mockWhiteboard({
          content: { documentId },
          event_id: expect.any(String),
          origin_server_ts: expect.any(Number),
          state_key: 'widget-id',
        }),
      },
    });
  });

  it('should wait for moderator to create a new whiteboard', async () => {
    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          users_default: 0,
          users: {
            '@moderator-user': 50,
          },
        },
      }),
    );

    const { result, waitForNextUpdate } = renderHook(
      () => useOwnedWhiteboard(),
      { wrapper: Wrapper },
    );

    expect(result.current).toEqual({ loading: true });

    await waitForNextUpdate();

    expect(result.current).toEqual({
      loading: false,
      value: { type: 'waiting' },
    });

    widgetApi.mockSendRoomEvent(
      mockDocumentCreate({
        sender: '@moderator-user',
      }),
    );

    widgetApi.mockSendStateEvent(
      mockWhiteboard({
        sender: '@moderator-user',
        content: {
          documentId: '$document-0',
        },
      }),
    );

    await waitForNextUpdate();

    expect(result.current).toEqual({
      loading: false,
      value: {
        type: 'whiteboard',
        event: mockWhiteboard({
          sender: '@moderator-user',
          content: { documentId: '$document-0' },
          event_id: expect.any(String),
          origin_server_ts: expect.any(Number),
        }),
      },
    });
  });

  it('should skip error when power level patching fails', async () => {
    widgetApi.mockSendStateEvent(mockPowerLevelsEvent());

    widgetApi.sendStateEvent.mockImplementationOnce(() => {
      throw new Error('Error on patching power levels');
    });

    const { result, waitForNextUpdate } = renderHook(
      () => useOwnedWhiteboard(),
      { wrapper: Wrapper },
    );

    expect(result.current).toEqual({ loading: true });

    await waitForNextUpdate();

    expect(widgetApi.sendStateEvent).toBeCalledWith('m.room.power_levels', {
      events: { 'net.nordeck.whiteboard.sessions': 0 },
      users_default: 100,
    });

    expect(result.current).toEqual({
      loading: false,
      value: {
        type: 'whiteboard',
        event: mockWhiteboard({
          content: { documentId: expect.any(String) },
          event_id: expect.any(String),
          origin_server_ts: expect.any(Number),
          state_key: 'widget-id',
        }),
      },
    });
  });

  it('should reject if whiteboard creation fails', async () => {
    widgetApi.mockSendStateEvent(mockPowerLevelsEvent());

    widgetApi.sendStateEvent.mockImplementation(() => {
      throw new Error('Error on sending state events');
    });

    const { result, waitForNextUpdate } = renderHook(
      () => useOwnedWhiteboard(),
      { wrapper: Wrapper },
    );

    expect(result.current).toEqual({ loading: true });

    await waitForNextUpdate();

    expect(result.error).toEqual(
      new Error('Could not update whiteboard: Error on sending state events'),
    );
  });
});
