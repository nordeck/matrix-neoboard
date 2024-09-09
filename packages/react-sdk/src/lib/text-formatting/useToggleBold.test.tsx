/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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
import { ComponentType, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Toolbar } from '../../components/common/Toolbar';
import { WhiteboardSlideInstance } from '../../state';
import {
  WhiteboardTestingContextProvider,
  mockCircleElement,
  mockLineElement,
  mockRectangleElement,
  mockTriangleElement,
  mockWhiteboardManager,
} from '../testUtils/documentTestUtils';
import { useToggleBold } from './useToggleBold';

describe('useToggleBold', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let slide: WhiteboardSlideInstance;
  let widgetApi: MockedWidgetApi;

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide',
          [
            ['rectangle', mockRectangleElement({ textBold: false })],
            ['circle', mockCircleElement({ textBold: true })],
            ['triangle', mockTriangleElement({ textBold: false })],
            ['line', mockLineElement()],
          ],
        ],
      ],
    });

    slide = whiteboardManager.getActiveWhiteboardInstance()!.getSlide('slide');
    slide.setActiveElementIds(['rectangle', 'circle', 'triangle', 'line']);

    Wrapper = ({ children }) => (
      <WhiteboardTestingContextProvider
        whiteboardManager={whiteboardManager}
        widgetApi={widgetApi}
      >
        <Toolbar>{children}</Toolbar>
      </WhiteboardTestingContextProvider>
    );
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should reflect the bold text state of the first element (not bold)', () => {
    const { result } = renderHook(useToggleBold, { wrapper: Wrapper });
    expect(result.current.isBold).toBe(false);
  });

  it('should toggle bold for one element', async () => {
    slide.setActiveElementId('rectangle');
    const { result } = renderHook(useToggleBold, { wrapper: Wrapper });

    act(() => {
      result.current.toggleBold();
    });

    expect(slide.getElement('rectangle')).toEqual(
      expect.objectContaining({ textBold: true }),
    );
  });

  it('should switch bold text for several elements', async () => {
    const { result } = renderHook(useToggleBold, { wrapper: Wrapper });

    act(() => {
      result.current.toggleBold();
    });

    expect(slide.getElement('rectangle')).toEqual(
      expect.objectContaining({ textBold: true }),
    );

    expect(slide.getElement('circle')).toEqual(
      expect.objectContaining({ textBold: true }),
    );

    expect(slide.getElement('triangle')).toEqual(
      expect.objectContaining({ textBold: true }),
    );
  });
});
