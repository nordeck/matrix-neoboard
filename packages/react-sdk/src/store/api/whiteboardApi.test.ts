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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockWhiteboard } from '../../lib/testUtils/matrixTestUtils';
import { createStore } from '../store';
import { whiteboardApi } from './whiteboardApi';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getWhiteboards', () => {
  it('should return whiteboards', async () => {
    const whiteboard0 = widgetApi.mockSendStateEvent(
      mockWhiteboard({
        origin_server_ts: 5,
      }),
    );
    const whiteboard1 = widgetApi.mockSendStateEvent(
      mockWhiteboard({
        state_key: 'whiteboard-1',
        origin_server_ts: 4,
      }),
    );

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(whiteboardApi.endpoints.getWhiteboards.initiate())
        .unwrap(),
    ).resolves.toEqual({
      entities: {
        [whiteboard0.state_key]: whiteboard0,
        [whiteboard1.state_key]: whiteboard1,
      },
      ids: [whiteboard1.state_key, whiteboard0.state_key],
    });
  });

  it('should handle missing whiteboards', async () => {
    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(whiteboardApi.endpoints.getWhiteboards.initiate())
        .unwrap(),
    ).resolves.toEqual({ entities: {}, ids: [] });
  });

  it('should handle load errors', async () => {
    widgetApi.receiveStateEvents.mockRejectedValue(new Error('Some Error'));

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(whiteboardApi.endpoints.getWhiteboards.initiate())
        .unwrap(),
    ).rejects.toEqual({
      message: 'Could not load whiteboards: Some Error',
      name: 'LoadFailed',
    });
  });

  it('should observe whiteboards', async () => {
    const store = createStore({ widgetApi });

    store.dispatch(whiteboardApi.endpoints.getWhiteboards.initiate());

    await waitFor(() =>
      expect(
        whiteboardApi.endpoints.getWhiteboards.select()(store.getState()).data,
      ).toEqual({ entities: {}, ids: [] }),
    );

    const whiteboard = widgetApi.mockSendStateEvent(mockWhiteboard());

    await waitFor(() =>
      expect(
        whiteboardApi.endpoints.getWhiteboards.select()(store.getState()).data,
      ).toEqual({
        entities: {
          [whiteboard.state_key]: whiteboard,
        },
        ids: [whiteboard.state_key],
      }),
    );
  });

  it('should observe deletion of whiteboards', async () => {
    const store = createStore({ widgetApi });
    const whiteboard = widgetApi.mockSendStateEvent(mockWhiteboard());

    store.dispatch(whiteboardApi.endpoints.getWhiteboards.initiate());

    await waitFor(() =>
      expect(
        whiteboardApi.endpoints.getWhiteboards.select()(store.getState()).data,
      ).toEqual({
        entities: {
          [whiteboard.state_key]: whiteboard,
        },
        ids: [whiteboard.state_key],
      }),
    );

    // Delete whiteboard
    widgetApi.mockSendStateEvent({
      type: 'net.nordeck.whiteboard',
      sender: '@user-id:example.com',
      content: {},
      state_key: whiteboard.state_key,
      origin_server_ts: 0,
      event_id: '$event-id-0',
      room_id: '!room-id:example.com',
    });

    await waitFor(() =>
      expect(
        whiteboardApi.endpoints.getWhiteboards.select()(store.getState()).data,
      ).toEqual({ entities: {}, ids: [] }),
    );
  });
});

describe('updateWhiteboard', () => {
  it('should create whiteboard', async () => {
    const store = createStore({ widgetApi });
    const whiteboard = mockWhiteboard().content;

    await expect(
      store
        .dispatch(
          whiteboardApi.endpoints.updateWhiteboard.initiate({
            whiteboardId: 'whiteboard-0',
            content: whiteboard,
          }),
        )
        .unwrap(),
    ).resolves.toEqual({
      event: expect.objectContaining({
        content: whiteboard,
        state_key: 'whiteboard-0',
      }),
    });

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      'net.nordeck.whiteboard',
      whiteboard,
      {
        stateKey: 'whiteboard-0',
      },
    );
  });

  it('should update existing whiteboard', async () => {
    const store = createStore({ widgetApi });

    widgetApi.mockSendStateEvent(mockWhiteboard());

    const whiteboard = mockWhiteboard({
      content: {
        documentId: '$new-document-id',
      },
    }).content;

    await expect(
      store
        .dispatch(
          whiteboardApi.endpoints.updateWhiteboard.initiate({
            whiteboardId: 'whiteboard-0',
            content: whiteboard,
          }),
        )
        .unwrap(),
    ).resolves.toEqual({
      event: expect.objectContaining({
        content: whiteboard,
        state_key: 'whiteboard-0',
      }),
    });

    expect(widgetApi.sendStateEvent).toHaveBeenCalledWith(
      'net.nordeck.whiteboard',
      whiteboard,
      { stateKey: 'whiteboard-0' },
    );
  });

  it('should reject on error', async () => {
    const store = createStore({ widgetApi });

    widgetApi.receiveStateEvents.mockRejectedValue(new Error('Some Error'));

    await expect(
      store
        .dispatch(
          whiteboardApi.endpoints.updateWhiteboard.initiate({
            whiteboardId: 'whiteboard-0',
            content: mockWhiteboard().content,
          }),
        )
        .unwrap(),
    ).rejects.toEqual({
      name: 'UpdateFailed',
      message: 'Could not update whiteboard: Some Error',
    });

    expect(widgetApi.sendStateEvent).not.toHaveBeenCalled();
  });

  // Does this test make any sense without an assertion?
  // eslint-disable-next-line
  it('should be idempotent', async () => {
    const store = createStore({ widgetApi });
    const whiteboard = mockWhiteboard().content;

    await store
      .dispatch(
        whiteboardApi.endpoints.updateWhiteboard.initiate({
          whiteboardId: 'whiteboard-0',
          content: whiteboard,
        }),
      )
      .unwrap();
    await store
      .dispatch(
        whiteboardApi.endpoints.updateWhiteboard.initiate({
          whiteboardId: 'whiteboard-0',
          content: whiteboard,
        }),
      )
      .unwrap();
  });
});
