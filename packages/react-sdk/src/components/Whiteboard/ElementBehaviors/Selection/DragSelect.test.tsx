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
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockWhiteboardManager,
} from '../../../../lib/testUtils/documentTestUtils';
import { Point, WhiteboardSlideInstance } from '../../../../state';
import { LayoutStateProvider, useLayoutState } from '../../../Layout';
import { WhiteboardHotkeysProvider } from '../../../WhiteboardHotkeysProvider';
import { SvgCanvas } from '../../SvgCanvas';
import * as svgUtils from '../../SvgCanvas/utils';
import { DragSelect } from './DragSelect';

// Mock to avoid SVG native functions not available in the test context
vi.mock('../../SvgCanvas/utils');

describe('<DragSelect/>', () => {
  let activeSlide: WhiteboardSlideInstance;
  let dragSelectStartCoords: Point | undefined;
  let setDragSelectStartCoords: (point: Point | undefined) => void;
  let widgetApi: MockedWidgetApi;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            [
              'element-0',
              mockEllipseElement({
                position: { x: 0, y: 0 },
                width: 50,
                height: 50,
              }),
            ],
            [
              'element-1',
              mockEllipseElement({
                position: { x: 50, y: 50 },
                width: 50,
                height: 50,
              }),
            ],
            [
              'element-2',
              mockEllipseElement({
                position: { x: 101, y: 101 },
                width: 50,
                height: 50,
              }),
            ],
          ],
        ],
      ],
    });
    const activeWhiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboard.getSlide('slide-0');

    function LayoutStateExtractor() {
      ({ dragSelectStartCoords, setDragSelectStartCoords } = useLayoutState());
      return null;
    }

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <LayoutStateExtractor />
        <SvgCanvas viewportWidth={200} viewportHeight={200}>
          <WhiteboardHotkeysProvider>
            <WhiteboardTestingContextProvider
              whiteboardManager={whiteboardManager}
              widgetApi={widgetApi}
            >
              {children}
            </WhiteboardTestingContextProvider>
          </WhiteboardHotkeysProvider>
        </SvgCanvas>
      </LayoutStateProvider>
    );
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should clear the drag select start coordinates on pointer up', () => {
    render(<DragSelect />, { wrapper: Wrapper });
    act(() => {
      setDragSelectStartCoords({ x: 0, y: 0 });
    });

    fireEvent.pointerUp(screen.getByTestId('drag-select-layer'));

    expect(dragSelectStartCoords).toBeUndefined();
  });

  it('should not render a selection if there is a pointer move but not start coordinates', () => {
    render(<DragSelect />, { wrapper: Wrapper });

    vi.mocked(svgUtils.calculateSvgCoords).mockReturnValue({ x: 50, y: 50 });
    fireEvent.pointerMove(screen.getByTestId('drag-select-layer'), {
      clientX: 50,
      clientY: 50,
    });

    expect(screen.queryByTestId('drag-selection')).not.toBeInTheDocument();
  });

  it('should render a selection if there is a pointer move and start coordinates', () => {
    render(<DragSelect />, { wrapper: Wrapper });

    // draw a selection from top left to 50,50
    act(() => {
      setDragSelectStartCoords({ x: 0, y: 0 });
    });
    vi.mocked(svgUtils.calculateSvgCoords).mockReturnValue({ x: 50, y: 50 });
    fireEvent.pointerMove(screen.getByTestId('drag-select-layer'), {
      clientX: 50,
      clientY: 50,
    });

    expect(screen.getByTestId('drag-selection')).toBeInTheDocument();
  });

  it('should select elements intersecting the selection in the order they are selected', () => {
    render(<DragSelect />, { wrapper: Wrapper });

    // Select an area with only element-1 inside
    act(() => {
      setDragSelectStartCoords({ x: 60, y: 60 });
    });
    vi.mocked(svgUtils.calculateSvgCoords).mockReturnValue({ x: 70, y: 70 });
    fireEvent.pointerMove(screen.getByTestId('drag-select-layer'), {
      clientX: 70,
      clientY: 70,
    });

    expect(activeSlide.getActiveElementIds()).toEqual(['element-1']);

    // Now extend the selection to the corner where element-0 is located
    vi.mocked(svgUtils.calculateSvgCoords).mockReturnValue({ x: 0, y: 0 });
    fireEvent.pointerMove(screen.getByTestId('drag-select-layer'), {
      clientX: 0,
      clientY: 0,
    });

    expect(activeSlide.getActiveElementIds()).toEqual([
      'element-1',
      'element-0',
    ]);
  });
});
