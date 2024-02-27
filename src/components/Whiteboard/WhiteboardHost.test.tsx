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
import { render, screen } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { act } from 'react-dom/test-utils';
import { WhiteboardHost } from '.';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { Point, WhiteboardSlideInstance } from '../../state';
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
  let activeSlide: WhiteboardSlideInstance;
  let setDragSelectStartCoords: (point: Point | undefined) => void;
  let widgetApi: MockedWidgetApi;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    const { whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', [['element-0', mockEllipseElement()]]]],
    });
    const activeWhiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboard.getSlide('slide-0');

    function LayoutStateExtractor() {
      ({ setDragSelectStartCoords } = useLayoutState());
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
            {children}
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
});
