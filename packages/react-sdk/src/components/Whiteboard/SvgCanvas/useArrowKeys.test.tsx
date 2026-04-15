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
import { act, renderHook } from '@testing-library/react';
import { ComponentType, KeyboardEvent, PropsWithChildren } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from 'vitest';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../../lib/testUtils';
import { WhiteboardManager } from '../../../state';
import { WhiteboardHotkeysProvider } from '../../WhiteboardHotkeysProvider';
import { useSvgScaleContext } from '../SvgScaleContext';
import { SvgScaleContextType } from '../SvgScaleContext/context';
import { useArrowKeys } from './useArrowKeys';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('useArrowKeys', () => {
  let svgScaleContext: SvgScaleContextType;
  const ContextExtractor = () => {
    svgScaleContext = useSvgScaleContext();
    return null;
  };

  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let setPresentationMode: (
    enable: boolean,
    enableEdit?: boolean,
    presentationType?: 'presentation' | 'presenting',
  ) => void;

  beforeEach(() => {
    ({ whiteboardManager, setPresentationMode } = mockWhiteboardManager());

    Wrapper = ({ children }) => (
      <WhiteboardHotkeysProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <ContextExtractor />
          {children}
        </WhiteboardTestingContextProvider>
      </WhiteboardHotkeysProvider>
    );
  });

  it('should handle ArrowUp key down', async () => {
    const { result } = renderHook(() => useArrowKeys(), { wrapper: Wrapper });

    act(() => {
      result.current.handleKeyDown(createMockKeyboardEvent('ArrowUp'));
    });

    expect(svgScaleContext.translation).toEqual({
      x: 0,
      y: 20,
    });
  });

  it('should handle ArrowDown key down', async () => {
    const { result } = renderHook(() => useArrowKeys(), { wrapper: Wrapper });

    act(() => {
      result.current.handleKeyDown(createMockKeyboardEvent('ArrowDown'));
    });

    expect(svgScaleContext.translation).toEqual({
      x: 0,
      y: -20,
    });
  });

  it('should handle ArrowLeft key down', async () => {
    const { result } = renderHook(() => useArrowKeys(), { wrapper: Wrapper });

    act(() => {
      result.current.handleKeyDown(createMockKeyboardEvent('ArrowLeft'));
    });

    expect(svgScaleContext.translation).toEqual({
      x: 20,
      y: 0,
    });
  });

  it('should handle ArrowRight key down', async () => {
    const { result } = renderHook(() => useArrowKeys(), { wrapper: Wrapper });

    act(() => {
      result.current.handleKeyDown(createMockKeyboardEvent('ArrowRight'));
    });

    expect(svgScaleContext.translation).toEqual({
      x: -20,
      y: 0,
    });
  });

  it('should handle multiple arrow keys down', async () => {
    const { result } = renderHook(() => useArrowKeys(), { wrapper: Wrapper });

    act(() => {
      result.current.handleKeyDown(createMockKeyboardEvent('ArrowUp'));
    });

    expect(svgScaleContext.translation).toEqual({
      x: 0,
      y: 20,
    });

    act(() => {
      result.current.handleKeyDown(createMockKeyboardEvent('ArrowLeft'));
    });

    expect(svgScaleContext.translation).toEqual({
      x: 20,
      y: 40,
    });
  });

  it.each(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])(
    'should not handle %s key down if the presentation mode is active',
    async (key) => {
      setPresentationMode(true);

      const { result } = renderHook(() => useArrowKeys(), { wrapper: Wrapper });

      act(() => {
        result.current.handleKeyDown(createMockKeyboardEvent(key));
      });

      expect(svgScaleContext.translation).toEqual({
        x: 0,
        y: 0,
      });
    },
  );

  it.each(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'])(
    'should not handle %s key down if the presentation mode is active and presenting',
    async (key) => {
      setPresentationMode(true, false, 'presenting');

      const { result } = renderHook(() => useArrowKeys(), { wrapper: Wrapper });

      act(() => {
        result.current.handleKeyDown(createMockKeyboardEvent(key));
      });

      expect(svgScaleContext.translation).toEqual({
        x: 0,
        y: 0,
      });
    },
  );
});

function createMockKeyboardEvent(key: string): KeyboardEvent {
  return {
    key,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent;
}
