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
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from '@testing-library/react-hooks';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockWhiteboardManager,
} from '../../../../lib/testUtils/documentTestUtils';
import { Point, WhiteboardSlideInstance } from '../../../../state';
import { LayoutStateProvider, useLayoutState } from '../../../Layout';
import { WhiteboardHotkeysProvider } from '../../../WhiteboardHotkeysProvider';
import { SvgCanvas } from '../../SvgCanvas';
import { DragSelect } from './DragSelect';

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
            ['element-0', mockEllipseElement()],
            [
              'element-1',
              mockEllipseElement({
                position: { x: 20, y: 20 },
                width: 50,
                height: 50,
              }),
            ],
            [
              'element-2',
              mockEllipseElement({
                position: { x: 51, y: 51 },
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

  it('should clear the drag select start coordinates on mouse up', () => {
    render(<DragSelect />, { wrapper: Wrapper });
    act(() => {
      setDragSelectStartCoords({ x: 0, y: 0 });
    });

    fireEvent.mouseUp(screen.getByTestId('drag-select-layer'));

    expect(dragSelectStartCoords).toBeUndefined();
  });

  it('should not render a selection if there is a mouse move but not start coordinates', () => {
    render(<DragSelect />, { wrapper: Wrapper });

    fireEvent.mouseMove(screen.getByTestId('drag-select-layer'), {
      clientX: 50,
      clientY: 50,
    });

    expect(screen.queryByTestId('drag-selection')).not.toBeInTheDocument();
  });

  it('should render a selection if there is a mouse move and start coordinates', () => {
    render(<DragSelect />, { wrapper: Wrapper });

    // draw a selection from top left to 50,50
    act(() => {
      setDragSelectStartCoords({ x: 0, y: 0 });
    });
    fireEvent.mouseMove(screen.getByTestId('drag-select-layer'), {
      clientX: 50,
      clientY: 50,
    });

    expect(screen.getByTestId('drag-selection')).toBeInTheDocument();
  });

  it('should select elements intersecting the selection', () => {
    render(<DragSelect />, { wrapper: Wrapper });

    // draw a selection from top left to 50,50
    act(() => {
      setDragSelectStartCoords({ x: 0, y: 0 });
    });
    fireEvent.mouseMove(screen.getByTestId('drag-select-layer'), {
      clientX: 50,
      clientY: 50,
    });

    expect(activeSlide.getActiveElementIds()).toEqual([
      'element-0',
      'element-1',
    ]);
  });
});
