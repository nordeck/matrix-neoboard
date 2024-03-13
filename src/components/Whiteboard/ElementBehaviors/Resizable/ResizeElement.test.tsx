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
import { mocked } from 'jest-mock';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockImageElement,
  mockLineElement,
  mockPolylineElement,
  mockWhiteboardManager,
} from '../../../../lib/testUtils/documentTestUtils';
import { WhiteboardSlideInstance } from '../../../../state';
import { ElementOverridesProvider } from '../../../ElementOverridesProvider';
import { LayoutStateProvider } from '../../../Layout';
import { SvgCanvas } from '../../SvgCanvas';
import { ResizeElement } from './ResizeElement';
import { calculateDimensions } from './utils';

jest.mock('./utils', () => {
  const original = jest.requireActual('./utils');
  return {
    ...original,
    calculateDimensions: jest.fn(),
  };
});

// mock useMeasure to return anything to get a scale
jest.mock('../../SvgCanvas/useMeasure', () => {
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

describe('<ResizeElement />', () => {
  let widgetApi: MockedWidgetApi;
  let activeSlide: WhiteboardSlideInstance;
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
              mockPolylineElement({
                points: [
                  { x: 0, y: 0 },
                  { x: 0.5, y: 0.5 },
                  { x: 1, y: 1 },
                ],
                position: { x: 0, y: 0 },
              }),
            ],
            [
              'element-1',
              mockLineElement({
                points: [
                  { x: 0, y: 0 },
                  { x: 0, y: 0 },
                ],
                position: { x: 0, y: 0 },
              }),
            ],
            ['element-2', mockImageElement()],
          ],
        ],
      ],
    });
    const activeWhiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboard.getSlide('slide-0');

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <ElementOverridesProvider>
            <SvgCanvas viewportWidth={200} viewportHeight={200}>
              {children}
            </SvgCanvas>
          </ElementOverridesProvider>
        </WhiteboardTestingContextProvider>
      </LayoutStateProvider>
    );
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should resize polyline elements', () => {
    render(<ResizeElement elementId="element-0" />, {
      wrapper: Wrapper,
    });

    // drag a resize box from 0,0 to 50,50
    const resizeHandleBottomRight = screen.getByTestId(
      'resize-handle-bottomRight',
    );
    mocked(calculateDimensions).mockReturnValue({
      elementKind: 'polyline',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      points: [
        { x: 0, y: 0 },
        { x: 0.5, y: 0.5 },
        { x: 1, y: 1 },
      ],
    });
    fireEvent.mouseDown(resizeHandleBottomRight);
    mocked(calculateDimensions).mockReturnValue({
      elementKind: 'polyline',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      points: [
        { x: 0, y: 0 },
        { x: 25, y: 25 },
        { x: 50, y: 50 },
      ],
    });
    fireEvent.mouseMove(resizeHandleBottomRight);
    fireEvent.mouseUp(resizeHandleBottomRight);

    const element = activeSlide.getElement('element-0');
    expect(element).toEqual({
      kind: 'polyline',
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
      position: {
        x: 0,
        y: 0,
      },
      strokeColor: '#ffffff',
      type: 'path',
    });
  });

  it('should resize line elements', () => {
    render(<ResizeElement elementId="element-1" />, {
      wrapper: Wrapper,
    });

    // drag the end of a line from 0,0 to 50,50
    const resizeHandleBottomRight = screen.getByTestId('resize-handle-end');
    mocked(calculateDimensions).mockReturnValue({
      elementKind: 'line',
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 0 },
      ],
    });
    fireEvent.mouseDown(resizeHandleBottomRight);
    mocked(calculateDimensions).mockReturnValue({
      elementKind: 'line',
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      points: [
        { x: 0, y: 0 },
        { x: 50, y: 50 },
      ],
    });
    fireEvent.mouseMove(resizeHandleBottomRight);
    fireEvent.mouseUp(resizeHandleBottomRight);

    const element = activeSlide.getElement('element-1');
    expect(element).toEqual({
      kind: 'line',
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
      position: {
        x: 0,
        y: 0,
      },
      strokeColor: '#ffffff',
      type: 'path',
    });
  });

  it('should not resize image elements', () => {
    render(<ResizeElement elementId="element-2" />, {
      wrapper: Wrapper,
    });

    expect(
      screen.queryByTestId('resize-handle-se-resize'),
    ).not.toBeInTheDocument();
  });
});
