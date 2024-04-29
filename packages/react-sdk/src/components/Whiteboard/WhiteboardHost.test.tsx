/*
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
import { ComponentType, PropsWithChildren } from 'react';
import { act } from 'react-dom/test-utils';
import { WhiteboardHost } from '.';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockTextElement,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import {
  Point,
  WhiteboardInstance,
  WhiteboardSlideInstance,
} from '../../state';
import { ElementOverridesProvider } from '../ElementOverridesProvider';
import { LayoutStateProvider, useLayoutState } from '../Layout';
import { WhiteboardHotkeysProvider } from '../WhiteboardHotkeysProvider';

jest.mock('./SvgCanvas/utils', () => {
  const original = jest.requireActual('./SvgCanvas/utils');
  return {
    ...original,
    calculateScale: () => 1,
  };
});

describe('<WhiteboardHost/>', () => {
  let activeWhiteboard: WhiteboardInstance;
  let activeSlide: WhiteboardSlideInstance;
  let setDragSelectStartCoords: (point: Point | undefined) => void;
  let setShowGrid: (value: boolean) => void;
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
              mockTextElement({
                position: { x: 200, y: 200 },
              }),
            ],
          ],
        ],
      ],
    });
    activeWhiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboard.getSlide('slide-0');

    function LayoutStateExtractor() {
      ({ setDragSelectStartCoords, setShowGrid } = useLayoutState());
      return null;
    }

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <LayoutStateExtractor />
        <WhiteboardHotkeysProvider>
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            <ElementOverridesProvider>{children}</ElementOverridesProvider>
          </WhiteboardTestingContextProvider>
        </WhiteboardHotkeysProvider>
      </LayoutStateProvider>
    );
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should show the element bar if an element is selected', () => {
    activeSlide.setActiveElementIds(['element-0']);
    render(<WhiteboardHost />, { wrapper: Wrapper });

    expect(
      screen.getByRole('button', { name: 'Delete element' }),
    ).toBeInTheDocument();
  });

  it('should not show the element bar if an element is selected and the drag selection start coordinates are set', () => {
    activeSlide.setActiveElementIds(['element-0']);
    render(<WhiteboardHost />, { wrapper: Wrapper });
    act(() => {
      setDragSelectStartCoords({ x: 0, y: 0 });
    });

    expect(
      screen.queryByRole('button', { name: 'Delete element' }),
    ).not.toBeInTheDocument();
  });

  it('should not show the drag select layer if the drag selection start coordinates are not set', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    expect(screen.queryByTestId('drag-select-layer')).not.toBeInTheDocument();
  });

  it('should show the drag select layer if the drag selection start coordinates are set', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });
    act(() => {
      setDragSelectStartCoords({ x: 0, y: 0 });
    });

    expect(screen.getByTestId('drag-select-layer')).toBeInTheDocument();
  });

  it('should show the resize handles if an element is selected', () => {
    activeSlide.setActiveElementIds(['element-0']);
    render(<WhiteboardHost />, { wrapper: Wrapper });

    expect(screen.getByTestId('resize-element')).toBeInTheDocument();
  });

  it('should not show the resize handles if an element is selected and the drag selection start coordinates are set', () => {
    activeSlide.setActiveElementIds(['element-0']);
    render(<WhiteboardHost />, { wrapper: Wrapper });
    act(() => {
      setDragSelectStartCoords({ x: 0, y: 0 });
    });

    expect(screen.queryByTestId('resize-element')).not.toBeInTheDocument();
  });

  it('should contain an element border if an element is selected', () => {
    activeSlide.setActiveElementIds(['element-0']);
    render(<WhiteboardHost />, { wrapper: Wrapper });

    expect(screen.getByTestId('element-0-border')).toBeInTheDocument();
  });

  it('should move multiple selected elements by dragging the border', () => {
    activeSlide.setActiveElementIds(['element-0', 'element-1']);
    render(<WhiteboardHost />, { wrapper: Wrapper });

    // move 150px on x and 250px on y axis
    const border = screen.getByTestId('element-0-border');
    fireEvent.mouseDown(border, {
      clientX: 150,
      clientY: 150,
    });
    fireEvent.mouseMove(border, {
      clientX: 300,
      clientY: 400,
    });
    fireEvent.mouseUp(border);

    expect(activeSlide.getElement('element-0')?.position).toEqual({
      x: 160,
      y: 240,
    });
    expect(activeSlide.getElement('element-1')?.position).toEqual({
      x: 360,
      y: 440,
    });
  });

  it('should not contain an element border if no element is selected', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    expect(screen.queryByTestId('element-0-border')).not.toBeInTheDocument();
  });

  it('should show the grid for the presenter in presentation mode if it is enabled', () => {
    setShowGrid(true);
    activeWhiteboard.getPresentationManager().startPresentation();

    render(<WhiteboardHost />, { wrapper: Wrapper });

    expect(screen.getByTestId('grid')).toBeInTheDocument();
  });
});
