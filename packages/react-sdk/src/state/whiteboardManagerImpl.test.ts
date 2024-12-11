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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockWhiteboard } from '../lib/testUtils/matrixTestUtils';
import { createStore } from '../store';
import { WhiteboardInstanceImpl } from './whiteboardInstanceImpl';
import { createWhiteboardManager } from './whiteboardManagerImpl';

// Mock away WebRTC stuff
// We don't test WebRTC here and we don't want to have side-effects from that.
vi.mock('./communication/connection', async (importOriginal) => {
  const original = (await importOriginal()) as object;
  return {
    ...original,
    WebRtcPeerConnection: vi.fn().mockImplementation(() => {
      return {
        observeMessages: () => {
          return {
            subscribe: () => {},
          };
        },
        observeStatistics: () => {
          return {
            subscribe: () => {},
          };
        },
      };
    }),
  };
});

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

const createTestWhiteboardManager = () => {
  const store = createStore({ widgetApi });
  return createWhiteboardManager(store, Promise.resolve(widgetApi));
};

describe('WhiteboardManagerImpl', () => {
  it('should return undefined whiteboard instance', () => {
    const whiteboardManager = createTestWhiteboardManager();

    expect(whiteboardManager.getActiveWhiteboardInstance()).toBeUndefined();
  });

  it('should create whiteboard instance', () => {
    const whiteboardManager = createTestWhiteboardManager();

    const event = widgetApi.mockSendStateEvent(mockWhiteboard());
    whiteboardManager.selectActiveWhiteboardInstance(event, '@user-id');

    expect(whiteboardManager.getActiveWhiteboardInstance()).toBeInstanceOf(
      WhiteboardInstanceImpl,
    );
  });

  // flakes
  it('should destroy a whiteboard when selecting a new one', async () => {
    const whiteboardManager = createTestWhiteboardManager();

    const event0 = widgetApi.mockSendStateEvent(mockWhiteboard());
    const event1 = widgetApi.mockSendStateEvent(
      mockWhiteboard({ event_id: '$event-id-1', state_key: 'whiteboard-1' }),
    );

    whiteboardManager.selectActiveWhiteboardInstance(event0, '@user-id');

    const destroySpy = vi.spyOn(
      whiteboardManager.getActiveWhiteboardInstance() as WhiteboardInstanceImpl,
      'destroy',
    );

    // send same event
    whiteboardManager.selectActiveWhiteboardInstance(event0, '@user-id');
    expect(destroySpy).not.toHaveBeenCalled();

    // Select another whiteboard
    whiteboardManager.selectActiveWhiteboardInstance(event1, '@user-id');
    expect(destroySpy).toHaveBeenCalled();
  });

  describe('clear', () => {
    it('should destroy and clear the whiteboard', () => {
      const whiteboardManager = createTestWhiteboardManager();

      // Hook into WhiteboardInstanceImpl.create to add a spy for destroy().
      const originalCreate = WhiteboardInstanceImpl.create.bind(
        WhiteboardInstanceImpl,
      );
      const createSpy = vi.spyOn(WhiteboardInstanceImpl, 'create');
      createSpy.mockImplementation(
        (...args: Parameters<typeof originalCreate>) => {
          const whiteboard = originalCreate(...args);
          vi.spyOn(whiteboard, 'destroy');
          return whiteboard;
        },
      );

      const whiteboardEvent = widgetApi.mockSendStateEvent(mockWhiteboard());
      whiteboardManager.selectActiveWhiteboardInstance(
        whiteboardEvent,
        '@user:example.com',
      );

      const whiteboard = whiteboardManager.getActiveWhiteboardInstance();

      expect(whiteboard).toBeDefined();

      whiteboardManager.clear();

      expect(whiteboard!.destroy).toHaveBeenCalled();

      expect(whiteboardManager.getActiveWhiteboardInstance()).toBeUndefined();
    });
  });
});
