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

import { RoomEvent, StateEvent } from '@matrix-widget-toolkit/api';
import { WidgetApiMockProvider } from '@matrix-widget-toolkit/react';
import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { renderHook, waitFor } from '@testing-library/react';
import { ComponentType, PropsWithChildren, useState } from 'react';
import { Provider } from 'react-redux';
import {
  mockDocumentCreate,
  mockPowerLevelsEvent,
  mockWhiteboard,
} from '../lib/testUtils/matrixTestUtils';
import {
  ROOM_EVENT_DOCUMENT_CHUNK,
  ROOM_EVENT_DOCUMENT_SNAPSHOT,
} from '../model';
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

    const { result } = renderHook(() => useOwnedWhiteboard(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({ loading: true });

    expect(widgetApi.sendRoomEvent).not.toHaveBeenCalledWith(
      'net.nordeck.whiteboard.document.create',
      expect.anything(),
    );
    expect(widgetApi.sendStateEvent).not.toHaveBeenCalledWith(
      'net.nordeck.whiteboard',
      expect.anything(),
      expect.anything(),
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        loading: false,
        value: {
          type: 'whiteboard',
          event: whiteboard,
        },
      });
    });
  });

  it('should return an existing whiteboard when loading of whiteboards is slower', async () => {
    const whiteboard = mockWhiteboard();

    let resolveWhiteboards: (events: StateEvent<unknown>[]) => void = () => {};
    widgetApi.receiveStateEvents.mockImplementation((eventType) => {
      if (eventType === 'm.room.power_levels') {
        return Promise.resolve([mockPowerLevelsEvent()]);
      } else if (eventType === 'net.nordeck.whiteboard') {
        return new Promise((resolve) => {
          resolveWhiteboards = resolve;
        });
      } else {
        return Promise.resolve([]);
      }
    });

    const { result } = renderHook(() => useOwnedWhiteboard(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current).toEqual({ loading: true });
    });

    resolveWhiteboards([whiteboard]);

    expect(widgetApi.sendRoomEvent).not.toHaveBeenCalledWith(
      'net.nordeck.whiteboard.document.create',
      expect.anything(),
    );
    expect(widgetApi.sendStateEvent).not.toHaveBeenCalledWith(
      'net.nordeck.whiteboard',
      expect.anything(),
      expect.anything(),
    );

    await waitFor(() => {
      expect(result.current).toEqual({
        loading: false,
        value: {
          type: 'whiteboard',
          event: whiteboard,
        },
      });
    });
  });

  // TODO: adjust this to the new error handling
  // https://github.com/testing-library/react-hooks-testing-library/blob/chore/migration-guide/MIGRATION_GUIDE.md#resulterror
  // eslint-disable-next-line
  it.skip('should reject when loading of whiteboards is slower and fails', async () => {
    let rejectWhiteboards: () => void = () => {};
    widgetApi.receiveStateEvents.mockImplementation((eventType) => {
      if (eventType === 'm.room.power_levels') {
        return Promise.resolve([mockPowerLevelsEvent()]);
      } else if (eventType === 'net.nordeck.whiteboard') {
        return new Promise((_resolve, reject) => {
          rejectWhiteboards = reject;
        });
      } else {
        return Promise.resolve([]);
      }
    });

    const { result } = renderHook(() => useOwnedWhiteboard(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current).toEqual({ loading: true });
    });

    rejectWhiteboards();

    expect(widgetApi.sendRoomEvent).not.toHaveBeenCalledWith(
      'net.nordeck.whiteboard.document.create',
      expect.anything(),
    );
    expect(widgetApi.sendStateEvent).not.toHaveBeenCalledWith(
      'net.nordeck.whiteboard',
      expect.anything(),
      expect.anything(),
    );
    // TODO: adjust this to the new error handling
    // expect(result.error).toEqual(new Error('could not load whiteboards'));
  });

  it('should create a new document, snapshot and whiteboard', async () => {
    widgetApi.mockSendStateEvent(mockPowerLevelsEvent());

    const { result } = renderHook(() => useOwnedWhiteboard(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current).toEqual({ loading: true });
    });

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      'm.room.power_levels',
      {
        events: { 'net.nordeck.whiteboard.sessions': 0 },
        users_default: 100,
      },
    );

    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      'net.nordeck.whiteboard.document.create',
      {},
    );

    // Expect a snapshot with a chunk
    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      ROOM_EVENT_DOCUMENT_SNAPSHOT,
      {
        chunkCount: 1,
        'm.relates_to': {
          // $event-2 is the ID of the document event
          event_id: '$event-2',
          rel_type: 'm.reference',
        },
      },
    );
    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      ROOM_EVENT_DOCUMENT_CHUNK,
      {
        documentId: '$event-2',
        sequenceNumber: 0,
        'm.relates_to': {
          // $event-3 is the ID of the snapshot event
          event_id: '$event-3',
          rel_type: 'm.reference',
        },
        data: expect.any(String),
      },
    );

    const documentId = await widgetApi.sendRoomEvent.mock.results[0].value.then(
      (e: RoomEvent) => e.event_id,
    );

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      'net.nordeck.whiteboard',
      { documentId },
      { stateKey: 'widget-id' },
    );

    await waitFor(() => {
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

    const { result } = renderHook(() => useOwnedWhiteboard(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current).toEqual({ loading: true });
    });

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

    expect(widgetApi.sendRoomEvent).not.toHaveBeenCalledWith(
      'net.nordeck.whiteboard.document.create',
      expect.anything(),
    );
    expect(widgetApi.sendStateEvent).not.toHaveBeenCalledWith(
      'net.nordeck.whiteboard',
      expect.anything(),
      expect.anything(),
    );

    await waitFor(() => {
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
  });

  it('should skip error when power level patching fails', async () => {
    widgetApi.mockSendStateEvent(mockPowerLevelsEvent());

    widgetApi.sendStateEvent.mockImplementationOnce(() => {
      throw new Error('Error on patching power levels');
    });

    const { result } = renderHook(() => useOwnedWhiteboard(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current).toEqual({ loading: true });
    });

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      'm.room.power_levels',
      {
        events: { 'net.nordeck.whiteboard.sessions': 0 },
        users_default: 100,
      },
    );

    await waitFor(() => {
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
  });

  // TODO: adjust this to the new error handling
  // https://github.com/testing-library/react-hooks-testing-library/blob/chore/migration-guide/MIGRATION_GUIDE.md#resulterror
  // eslint-disable-next-line
  it.skip('should reject if whiteboard creation fails', async () => {
    widgetApi.mockSendStateEvent(mockPowerLevelsEvent());

    widgetApi.sendStateEvent.mockImplementation(() => {
      throw new Error('Error on sending state events');
    });

    const { result } = renderHook(() => useOwnedWhiteboard(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current).toEqual({ loading: true });
    });

    // TODO: adjust this to the new error handling
    // expect(result.error).toEqual(new Error('Could not update whiteboard: Error on sending state events'));
  });
});
