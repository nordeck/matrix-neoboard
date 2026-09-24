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
import { ComponentType, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockPolylineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardSlideInstance } from '../../../state';
import { defaultStrokeWidth } from '../../common/consts';
import { usePolylineStrokeWidth } from './usePolylineStrokeWidth';

describe('usePolylineStrokeWidth', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let slide: WhiteboardSlideInstance;
  let widgetApi: MockedWidgetApi;

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['polyline-8', mockPolylineElement({ strokeWidth: 8 })],
            ['polyline-12', mockPolylineElement({ strokeWidth: 12 })],
            [
              'polyline-undefined',
              mockPolylineElement({ strokeWidth: undefined }),
            ],
            ['ellipse', mockEllipseElement()],
          ],
        ],
      ],
    });

    slide = whiteboardManager
      .getActiveWhiteboardInstance()!
      .getSlide('slide-0');

    Wrapper = ({ children }) => (
      <WhiteboardTestingContextProvider
        whiteboardManager={whiteboardManager}
        widgetApi={widgetApi}
      >
        {children}
      </WhiteboardTestingContextProvider>
    );
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should return the stroke width of the selected polyline', () => {
    slide.setActiveElementId('polyline-8');
    const { result } = renderHook(usePolylineStrokeWidth, {
      wrapper: Wrapper,
    });

    expect(result.current.strokeWidth).toBe(8);
  });

  it('should return the default stroke width if the selected polyline has none', () => {
    slide.setActiveElementId('polyline-undefined');
    const { result } = renderHook(usePolylineStrokeWidth, {
      wrapper: Wrapper,
    });

    expect(result.current.strokeWidth).toBe(defaultStrokeWidth);
  });

  it('should return an undefined stroke width when no polyline is selected', () => {
    slide.setActiveElementIds([]);
    const { result } = renderHook(usePolylineStrokeWidth, {
      wrapper: Wrapper,
    });

    expect(result.current.strokeWidth).toBeUndefined();
  });

  it('should return the stroke width of the first selected polyline if several elements are active', () => {
    slide.setActiveElementIds(['polyline-undefined', 'polyline-8']);
    const { result } = renderHook(usePolylineStrokeWidth, {
      wrapper: Wrapper,
    });

    expect(result.current.strokeWidth).toBe(defaultStrokeWidth);
  });

  it('should return the stroke width of the selected polyline among other selected element kinds', () => {
    slide.setActiveElementIds(['ellipse', 'polyline-8']);
    const { result } = renderHook(usePolylineStrokeWidth, {
      wrapper: Wrapper,
    });

    expect(result.current.strokeWidth).toBe(8);
  });

  it('should return an undefined stroke width if the active elements contain no polyline', () => {
    slide.setActiveElementId('ellipse');
    const { result } = renderHook(usePolylineStrokeWidth, {
      wrapper: Wrapper,
    });

    expect(result.current.strokeWidth).toBeUndefined();
  });

  it('should apply a stroke width to the selected polyline', () => {
    slide.setActiveElementId('polyline-8');
    const { result } = renderHook(usePolylineStrokeWidth, {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.applyStrokeWidth(16);
    });

    expect(slide.getElement('polyline-8')).toEqual(
      expect.objectContaining({ strokeWidth: 16 }),
    );
  });

  it('should apply a stroke width to all selected polylines', () => {
    slide.setActiveElementIds(['polyline-8', 'polyline-undefined', 'ellipse']);
    const { result } = renderHook(usePolylineStrokeWidth, {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.applyStrokeWidth(16);
    });

    expect(slide.getElement('polyline-8')).toEqual(
      expect.objectContaining({ strokeWidth: 16 }),
    );
    expect(slide.getElement('polyline-undefined')).toEqual(
      expect.objectContaining({ strokeWidth: 16 }),
    );
  });

  it('should not apply a stroke width if no polyline is selected', () => {
    slide.setActiveElementId('ellipse');
    const { result } = renderHook(usePolylineStrokeWidth, {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.applyStrokeWidth(16);
    });

    expect(slide.getElement('ellipse')).not.toEqual(
      expect.objectContaining({ strokeWidth: 16 }),
    );
  });
});
