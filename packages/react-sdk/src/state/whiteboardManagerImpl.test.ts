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
import { mockWhiteboard } from '../lib/testUtils/matrixTestUtils';
import { createStore } from '../store';
import { WhiteboardInstanceImpl } from './whiteboardInstanceImpl';
import { createWhiteboardManager } from './whiteboardManagerImpl';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('WhiteboardManagerImpl', () => {
  it('should return undefined whiteboard instance', () => {
    const store = createStore({ widgetApi });
    const whiteboardManager = createWhiteboardManager(
      store,
      Promise.resolve(widgetApi),
    );

    expect(whiteboardManager.getActiveWhiteboardInstance()).toBeUndefined();
  });

  it('should create whiteboard instance', () => {
    const store = createStore({ widgetApi });
    const whiteboardManager = createWhiteboardManager(
      store,
      Promise.resolve(widgetApi),
    );

    const event = widgetApi.mockSendStateEvent(mockWhiteboard());

    whiteboardManager.selectActiveWhiteboardInstance(event, '@user-id');

    expect(whiteboardManager.getActiveWhiteboardInstance()).toBeInstanceOf(
      WhiteboardInstanceImpl,
    );
  });

  it('should destroy a whiteboard when selecting a new one', () => {
    const store = createStore({ widgetApi });
    const whiteboardManager = createWhiteboardManager(
      store,
      Promise.resolve(widgetApi),
    );

    const event0 = widgetApi.mockSendStateEvent(mockWhiteboard());
    const event1 = widgetApi.mockSendStateEvent(
      mockWhiteboard({ event_id: '$event-id-1', state_key: 'whiteboard-1' }),
    );

    whiteboardManager.selectActiveWhiteboardInstance(event0, '@user-id');

    const destroySpy = jest.spyOn(
      whiteboardManager.getActiveWhiteboardInstance() as WhiteboardInstanceImpl,
      'destroy',
    );

    // send same event
    whiteboardManager.selectActiveWhiteboardInstance(event0, '@user-id');
    expect(destroySpy).not.toBeCalled();

    whiteboardManager.selectActiveWhiteboardInstance(event1, '@user-id');

    expect(destroySpy).toBeCalled();
  });
});
