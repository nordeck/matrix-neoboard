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
import { renderHook } from '@testing-library/react-hooks';
import { ComponentType, PropsWithChildren } from 'react';
import { act } from 'react-dom/test-utils';
import { Subject } from 'rxjs';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../lib/testUtils/documentTestUtils';
import { Point } from './crdt';
import { WhiteboardManager } from './types';
import { useActiveCursors } from './useActiveCursors';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('useActiveCursors', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager());

    Wrapper = ({ children }) => {
      return (
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      );
    };
  });

  it('should return no cursors', () => {
    const { result } = renderHook(() => useActiveCursors(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({});
  });

  it('should return cursors of other users', () => {
    const slide = whiteboardManager
      .getActiveWhiteboardInstance()!
      .getSlide('slide-0');

    const cursorPositionSubject = new Subject<Record<string, Point>>();
    jest
      .spyOn(slide, 'observeCursorPositions')
      .mockReturnValue(cursorPositionSubject);

    const { result } = renderHook(() => useActiveCursors(), {
      wrapper: Wrapper,
    });

    act(() => {
      cursorPositionSubject.next({
        '@user-id': { x: 1, y: 2 },
        '@another-user': { x: 3, y: 4 },
      });
    });

    expect(result.current).toEqual({
      '@another-user': { x: 3, y: 4 },
    });
  });
});
