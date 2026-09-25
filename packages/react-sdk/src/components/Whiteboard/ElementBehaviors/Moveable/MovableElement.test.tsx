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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from 'vitest';
import { WhiteboardHost } from '../..';
import {
  mockEllipseElement,
  mockFrameElement,
  mockPolylineElement,
  mockTextElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../../../lib/testUtils';
import {
  PathElement,
  Point,
  WhiteboardInstance,
  WhiteboardManager,
  WhiteboardSlideInstance,
} from '../../../../state';
import { ConnectionPointProvider } from '../../../ConnectionPointProvider';
import { ElementOverridesProvider } from '../../../ElementOverridesProvider';
import { LayoutStateProvider } from '../../../Layout';
import { WhiteboardHotkeysProvider } from '../../../WhiteboardHotkeysProvider';
import * as constants from './../../constants';

vi.mock('./SvgCanvas/utils', async () => ({
  ...(await vi.importActual('./SvgCanvas/utils')),
  calculateSvgCoords: (position: Point) => position,
}));

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

vi.mock('./SvgCanvas/useMeasure', () => ({
  useMeasure: vi.fn().mockReturnValue([vi.fn(), { width: 1920, height: 1080 }]),
}));

describe('MovableElement', () => {
  let widgetApi: MockedWidgetApi;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboard: WhiteboardInstance;
  let activeSlide: WhiteboardSlideInstance;

  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    vi.mocked(getEnvironment).mockImplementation(
      (_, defaultValue) => defaultValue,
    );

    document.elementsFromPoint = vi.fn().mockReturnValue([]);

    // Enable infinite canvas mode for this test
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );
    vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
    vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
    vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

    widgetApi = mockWidgetApi();

    ({ whiteboardManager } = mockWhiteboardManager({
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
            [
              'frame-0',
              mockFrameElement({
                position: { x: 500, y: 500 },
                width: 300,
                height: 300,
                attachedElements: ['ellipse-in-frame-0'],
              }),
            ],
            [
              'ellipse-in-frame-0',
              mockEllipseElement({
                position: { x: 510, y: 510 },
                width: 100,
                height: 100,
                attachedFrame: 'frame-0',
              }),
            ],
            [
              'polyline-0',
              mockPolylineElement({
                position: { x: 300, y: 300 },
                points: [
                  { x: 0, y: 0 },
                  { x: 20, y: 20 },
                  { x: 40, y: 0 },
                ],
                // pre-computed curve
                svgPathD:
                  'M0,0c6.66667,6.66667 13.33333,6.66667 20,6.66667c13.33333,0 26.66667,-6.66667 20,-13.33333',
              }),
            ],
          ],
        ],
      ],
    }));
    activeWhiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboard.getSlide('slide-0');

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <WhiteboardHotkeysProvider>
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            <ElementOverridesProvider>
              <ConnectionPointProvider>{children}</ConnectionPointProvider>
            </ElementOverridesProvider>
          </WhiteboardTestingContextProvider>
        </WhiteboardHotkeysProvider>
      </LayoutStateProvider>
    );

    vi.useFakeTimers();
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should not move an element if nothing was selected at the beginning of the move gesture', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });
    const element = screen.getByTestId('element-ellipse-element-0');

    const oldEllipse = activeSlide.getElement('element-0');

    // Using the touch events here because the react-draggable
    // library does not listen to pointer events.

    // clear selection
    act(() => activeSlide.setActiveElementIds([]));

    // initiate move
    fireEvent.touchStart(element, {
      touches: [
        {
          clientX: 50,
          clientY: 101,
          isPrimary: true,
        },
      ],
    });

    fireEvent.touchMove(element, {
      touches: [
        {
          clientX: 50,
          clientY: 101,
          isPrimary: true,
        },
      ],
    });

    // the element got selected
    act(() => activeSlide.setActiveElementIds(['element-0']));

    // another move event, this time element is selected
    fireEvent.touchMove(element, {
      touches: [
        {
          clientX: 60,
          clientY: 70,
          isPrimary: true,
        },
      ],
    });

    // expect that element stays in place
    const newEllipse = activeSlide.getElement('element-0');
    expect(oldEllipse?.position).toEqual(newEllipse?.position);
  });

  it('should not detach elements from a frame using touch move if a selection happens during move', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const frame = activeSlide.getElement('frame-0');

    // Using the touch events here because the react-draggable
    // library does not listen to pointer events.

    const htmlFrameElement = screen.getByTestId('element-frame-frame-0');

    fireEvent.touchStart(htmlFrameElement, {
      touches: [
        {
          identifier: 0,
          clientX: 505,
          clientY: 505,
          isPrimary: true,
        },
      ],
    });

    fireEvent.touchMove(htmlFrameElement, {
      touches: [
        {
          identifier: 0,
          clientX: 510,
          clientY: 510,
          isPrimary: true,
        },
      ],
    });

    // frame got selected before the touch ends
    act(() => activeSlide.setActiveElementIds(['frame-0']));

    fireEvent.touchEnd(htmlFrameElement, {
      touches: [],
      changedTouches: [
        {
          identifier: 0,
          clientX: 510,
          clientY: 510,
        },
      ],
    });

    const newFrame = activeSlide.getElement('frame-0');
    expect(newFrame).toEqual(frame);

    expect(newFrame).toMatchObject({
      attachedElements: ['ellipse-in-frame-0'],
    });
    // check that ellipse is connected to the frame
    expect(activeSlide.getElement('ellipse-in-frame-0')).toMatchObject({
      attachedFrame: 'frame-0',
    });
  });

  it('should not change the cached svgPathD of a polyline while drag-moving it', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-polyline-0');
    const oldPolyline = activeSlide.getElement('polyline-0') as PathElement;

    // select the polyline before starting the drag, so the move is applied
    act(() => activeSlide.setActiveElementIds(['polyline-0']));

    fireEvent.touchStart(element, {
      touches: [
        {
          identifier: 0,
          clientX: 300,
          clientY: 300,
          isPrimary: true,
        },
      ],
    });

    fireEvent.touchMove(element, {
      touches: [
        {
          identifier: 0,
          clientX: 350,
          clientY: 350,
          isPrimary: true,
        },
      ],
    });

    fireEvent.touchEnd(element, {
      touches: [],
      changedTouches: [
        {
          identifier: 0,
          clientX: 350,
          clientY: 350,
        },
      ],
    });

    const newPolyline = activeSlide.getElement('polyline-0');

    // the element actually moved, but curve stays the same
    expect(newPolyline).toEqual({
      ...oldPolyline,
      position: newPolyline?.position,
    });
  });
});
