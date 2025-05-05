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
import { useStore } from 'react-redux';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockImageElement,
  mockLineElement,
  mockPolylineElement,
  mockRectangleElement,
  mockWhiteboardManager,
} from '../../../../lib/testUtils/documentTestUtils';
import { WhiteboardSlideInstance } from '../../../../state';
import { RootState, StoreType } from '../../../../store';
import { ConnectionPointProvider } from '../../../ConnectionPointProvider';
import { ElementOverridesProvider } from '../../../ElementOverridesProvider';
import { LayoutStateProvider } from '../../../Layout';
import { SvgCanvas } from '../../SvgCanvas';
import { ResizeElement } from './ResizeElement';
import * as utils from './utils';

vi.mock('./utils', async () => {
  const original = await vi.importActual<typeof import('./utils')>('./utils');
  return {
    ...original,
    computeResizing: vi.fn(),
  };
});

// mock useMeasure to return anything to get a scale
vi.mock('../../SvgCanvas/useMeasure', () => {
  return {
    useMeasure: () => [
      null,
      {
        offsetX: 50,
        offsetY: 50,
        width: 100,
        height: 100,
      },
    ],
  };
});

beforeAll(() => {
  document.elementsFromPoint = vi.fn().mockReturnValue([]);
});

describe('<ResizeElement />', () => {
  let widgetApi: MockedWidgetApi;
  let activeSlide: WhiteboardSlideInstance;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let store: StoreType;

  const polylineElement = mockPolylineElement({
    points: [
      { x: 0, y: 0 },
      { x: 0.5, y: 0.5 },
      { x: 1, y: 1 },
    ],
    position: { x: 0, y: 0 },
  });

  const lineElement = mockLineElement({
    points: [
      { x: 0, y: 0 },
      { x: 0, y: 0 },
    ],
    position: { x: 0, y: 0 },
  });

  const imageElement = mockImageElement();
  const rectangleElement = mockRectangleElement();

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', polylineElement],
            ['element-1', lineElement],
            ['element-2', imageElement],
            ['element-3', rectangleElement],
          ],
        ],
      ],
    });
    const activeWhiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboard.getSlide('slide-0');

    const ExtractStore = () => {
      store = useStore<RootState>();
      return null;
    };

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <ExtractStore />
          <ElementOverridesProvider>
            <ConnectionPointProvider>
              <SvgCanvas viewportWidth={200} viewportHeight={200}>
                {children}
              </SvgCanvas>
            </ConnectionPointProvider>
          </ElementOverridesProvider>
        </WhiteboardTestingContextProvider>
      </LayoutStateProvider>
    );
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should resize rectangles and store the size', () => {
    render(<ResizeElement elementIds={['element-3']} />, {
      wrapper: Wrapper,
    });

    // drag a resize box from 0,0 to 50,50
    const resizeHandleBottomRight = screen.getByTestId(
      'resize-handle-bottomRight',
    );
    vi.spyOn(utils, 'computeResizing').mockReturnValue([
      {
        elementId: 'element-3',
        elementOverride: rectangleElement,
      },
    ]);
    fireEvent.mouseDown(resizeHandleBottomRight);
    vi.spyOn(utils, 'computeResizing').mockReturnValue([
      {
        elementId: 'element-3',
        elementOverride: {
          position: rectangleElement.position,
          width: 50,
          height: 50,
        },
      },
    ]);
    fireEvent.mouseMove(resizeHandleBottomRight);
    fireEvent.mouseUp(resizeHandleBottomRight);

    const element = activeSlide.getElement('element-3');
    expect(element).toEqual({
      ...rectangleElement,
      width: 50,
      height: 50,
    });

    expect(store.getState().shapeSizesReducer.rectangle).toEqual({
      width: 50,
      height: 50,
    });
  });

  it('should resize polyline elements', () => {
    render(<ResizeElement elementIds={['element-0']} />, {
      wrapper: Wrapper,
    });

    // drag a resize box from 0,0 to 50,50
    const resizeHandleBottomRight = screen.getByTestId(
      'resize-handle-bottomRight',
    );
    vi.spyOn(utils, 'computeResizing').mockReturnValue([
      {
        elementId: 'element-0',
        elementOverride: polylineElement,
      },
    ]);
    fireEvent.mouseDown(resizeHandleBottomRight);
    vi.spyOn(utils, 'computeResizing').mockReturnValue([
      {
        elementId: 'element-0',
        elementOverride: {
          position: polylineElement.position,
          points: [
            { x: 0, y: 0 },
            { x: 25, y: 25 },
            { x: 50, y: 50 },
          ],
        },
      },
    ]);
    fireEvent.mouseMove(resizeHandleBottomRight);
    fireEvent.mouseUp(resizeHandleBottomRight);

    const element = activeSlide.getElement('element-0');
    expect(element).toEqual({
      ...polylineElement,
      points: [
        // the first point should still be 0,0
        {
          x: 0,
          y: 0,
        },
        // the middle point should still be in the middle
        {
          x: 25,
          y: 25,
        },
        // the last point should be on the edges of the resize box
        {
          x: 50,
          y: 50,
        },
      ],
    });
  });

  it('should resize line elements', () => {
    render(<ResizeElement elementIds={['element-1']} />, {
      wrapper: Wrapper,
    });

    // drag the end of a line from 0,0 to 50,50
    const resizeHandleBottomRight = screen.getByTestId('resize-handle-end');
    vi.spyOn(utils, 'computeResizing').mockReturnValue([
      {
        elementId: 'element-1',
        elementOverride: lineElement,
      },
    ]);
    fireEvent.mouseDown(resizeHandleBottomRight);
    vi.spyOn(utils, 'computeResizing').mockReturnValue([
      {
        elementId: 'element-1',
        elementOverride: {
          position: lineElement.position,
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 50 },
          ],
        },
      },
    ]);
    fireEvent.mouseMove(resizeHandleBottomRight);
    fireEvent.mouseUp(resizeHandleBottomRight);

    const element = activeSlide.getElement('element-1');
    expect(element).toEqual({
      ...lineElement,
      points: [
        // the first point should still be 0,0
        {
          x: 0,
          y: 0,
        },
        // the last point should be on the edges of the resize box
        {
          x: 50,
          y: 50,
        },
      ],
    });
  });

  it('should resize image elements', () => {
    render(<ResizeElement elementIds={['element-2']} />, {
      wrapper: Wrapper,
    });

    // drag a resize box from 0,0 to 50,50
    const resizeHandleBottomRight = screen.getByTestId(
      'resize-handle-bottomRight',
    );
    vi.spyOn(utils, 'computeResizing').mockReturnValue([
      {
        elementId: 'element-2',
        elementOverride: imageElement,
      },
    ]);
    fireEvent.mouseDown(resizeHandleBottomRight);
    vi.spyOn(utils, 'computeResizing').mockReturnValue([
      {
        elementId: 'element-2',
        elementOverride: {
          position: imageElement.position,
          width: 50,
          height: 50,
        },
      },
    ]);
    fireEvent.mouseMove(resizeHandleBottomRight);
    fireEvent.mouseUp(resizeHandleBottomRight);

    const element = activeSlide.getElement('element-2');
    expect(element).toEqual({
      ...imageElement,
      width: 50,
      height: 50,
    });
  });

  it('should resize multiple elements', () => {
    render(<ResizeElement elementIds={['element-0', 'element-1']} />, {
      wrapper: Wrapper,
    });

    // drag a resize box from 0,0 to 100,100
    const resizeHandleBottomRight = screen.getByTestId(
      'resize-handle-bottomRight',
    );
    vi.spyOn(utils, 'computeResizing').mockReturnValue([
      {
        elementId: 'element-0',
        elementOverride: {
          position: polylineElement.position,
          points: [
            { x: 0, y: 0 },
            { x: 0.5, y: 0.5 },
            { x: 1, y: 1 },
          ],
        },
      },
      {
        elementId: 'element-1',
        elementOverride: {
          position: lineElement.position,
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 0 },
          ],
        },
      },
    ]);
    fireEvent.mouseDown(resizeHandleBottomRight);
    vi.spyOn(utils, 'computeResizing').mockReturnValue([
      {
        elementId: 'element-0',
        elementOverride: {
          position: polylineElement.position,
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 50 },
            { x: 100, y: 100 },
          ],
        },
      },
      {
        elementId: 'element-1',
        elementOverride: {
          position: lineElement.position,
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
        },
      },
    ]);
    fireEvent.mouseMove(resizeHandleBottomRight);
    fireEvent.mouseUp(resizeHandleBottomRight);

    const elements = activeSlide.getElements(['element-0', 'element-1']);
    expect(elements).toEqual({
      'element-0': {
        ...polylineElement,
        points: [
          // the first point should still be 0,0
          {
            x: 0,
            y: 0,
          },
          // the middle point should still be in the middle
          {
            x: 50,
            y: 50,
          },
          // the last point should be on the edges of the resize box
          {
            x: 100,
            y: 100,
          },
        ],
      },
      'element-1': {
        ...lineElement,
        points: [
          // the first point should still be 0,0
          {
            x: 0,
            y: 0,
          },
          // the last point should be on the edges of the resize box
          {
            x: 100,
            y: 100,
          },
        ],
      },
    });
  });
});
