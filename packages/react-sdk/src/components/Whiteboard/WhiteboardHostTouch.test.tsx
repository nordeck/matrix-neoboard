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
import { WhiteboardHost } from '.';
import {
  mockEllipseElement,
  mockFrameElement,
  mockTextElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils';
import {
  Point,
  WhiteboardInstance,
  WhiteboardManager,
  WhiteboardSlideInstance,
} from '../../state';
import { ConnectionPointProvider } from '../ConnectionPointProvider';
import { ElementOverridesProvider } from '../ElementOverridesProvider';
import { ActiveTool, LayoutStateProvider, useLayoutState } from '../Layout';
import { WhiteboardHotkeysProvider } from '../WhiteboardHotkeysProvider';
import { SvgScaleContextType, useSvgScaleContext } from './SvgScaleContext';
import * as constants from './constants';

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

describe('WhiteboardHost touch operations', () => {
  let widgetApi: MockedWidgetApi;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboard: WhiteboardInstance;
  let activeSlide: WhiteboardSlideInstance;

  let svgScaleContextState: SvgScaleContextType;
  let setActiveTool: (value: ActiveTool) => void;

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
              }),
            ],
          ],
        ],
      ],
    }));
    activeWhiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboard.getSlide('slide-0');

    function LayoutStateExtractor() {
      ({ setActiveTool } = useLayoutState());
      return null;
    }

    function SvgScaleContextExtractor() {
      svgScaleContextState = useSvgScaleContext();
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
            <SvgScaleContextExtractor />
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

  it('should tap to select', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');

    fireEvent.touchStart(element, {
      touches: [
        {
          clientX: 50,
          clientY: 101,
          isPrimary: true,
        },
      ],
    });

    vi.advanceTimersByTime(100);

    fireEvent.touchEnd(element, {
      touches: [],
    });

    expect(activeSlide.getActiveElementIds()).toEqual(['element-0']);
  });

  it('should not select if hold (not a tap)', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    fireEvent.touchStart(element, {
      touches: [
        {
          clientX: 50,
          clientY: 101,
          isPrimary: true,
        },
      ],
    });

    vi.advanceTimersByTime(400);

    fireEvent.touchEnd(element, {
      touches: [],
    });

    expect(activeSlide.getActiveElementIds()).not.toEqual(['element-0']);
  });

  it('should scale with 2 fingers', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });
    const element = screen.getByTestId('element-ellipse-element-0');
    fireEvent.touchStart(element, {
      touches: [
        {
          clientX: 50,
          clientY: 100,
          isPrimary: true,
        },
        {
          clientX: 50 + 30,
          clientY: 100 + 30,
          isPrimary: false,
        },
      ],
    });

    vi.advanceTimersByTime(200);

    fireEvent.touchMove(element, {
      touches: [
        {
          clientX: 50,
          clientY: 100,
          isPrimary: true,
        },
        {
          clientX: 50 + 80,
          clientY: 100 + 80,
          isPrimary: false,
        },
      ],
    });

    vi.advanceTimersByTime(200);

    fireEvent.touchEnd(element, {
      touches: [],
    });

    expect(svgScaleContextState.scale).toBeCloseTo(2.67);
  });

  it('should add a connector line', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    act(() => setActiveTool('line'));

    const unselect = screen.getByTestId('draft-mouse-handler');

    fireEvent.touchStart(unselect, {
      touches: [
        {
          clientX: 50,
          clientY: 100,
          isPrimary: true,
        },
      ],
    });

    vi.advanceTimersByTime(200);

    fireEvent.touchMove(unselect, {
      touches: [
        {
          clientX: 50 + 20,
          clientY: 100 + 20,
          isPrimary: true,
        },
      ],
    });

    vi.advanceTimersByTime(200);

    fireEvent.touchEnd(unselect, {
      changedTouches: [
        {
          clientX: 50 + 20,
          clientY: 100 + 20,
          isPrimary: true,
        },
      ],
      touches: [],
    });

    expect(activeSlide.getActiveElementIds().length).toBe(1);

    const line = activeSlide.getElement(activeSlide.getActiveElementIds()[0]);

    expect(line).toMatchObject({
      attachedFrame: undefined,
      connectedElementEnd: undefined,
      connectedElementStart: undefined,
      endMarker: undefined,
      kind: 'line',
      points: [
        {
          x: 0,
          y: 0,
        },
        {
          x: 20,
          y: 20,
        },
      ],
      position: {
        x: 60,
        y: 100,
      },
      startMarker: undefined,
      strokeColor: '#9e9e9e',
      type: 'path',
    });
  });

  it('should draw with the pencil tool', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    act(() => setActiveTool('polyline'));

    const dragHandler = screen.getByTestId('draft-mouse-handler');

    fireEvent.touchStart(dragHandler, {
      touches: [
        {
          clientX: 50,
          clientY: 100,
          isPrimary: true,
        },
      ],
    });

    vi.advanceTimersByTime(200);

    fireEvent.touchMove(dragHandler, {
      touches: [
        {
          clientX: 50 + 20,
          clientY: 100 + 20,
          isPrimary: true,
        },
      ],
    });

    vi.advanceTimersByTime(200);

    fireEvent.touchMove(dragHandler, {
      touches: [
        {
          clientX: 50,
          clientY: 100 + 40,
          isPrimary: true,
        },
      ],
    });

    vi.advanceTimersByTime(200);

    fireEvent.touchEnd(dragHandler, {
      changedTouches: [
        {
          clientX: 50,
          clientY: 100 + 40,
          isPrimary: true,
        },
      ],
      touches: [],
    });

    const line = activeSlide.getElement(activeSlide.getActiveElementIds()[0]);

    expect(line).toMatchObject({
      attachedFrame: undefined,
      connectedElementEnd: undefined,
      connectedElementStart: undefined,
      endMarker: undefined,
      kind: 'polyline',
      points: [
        {
          x: 0,
          y: 0,
        },
        {
          x: 20,
          y: 20,
        },
        {
          x: 0,
          y: 40,
        },
      ],
      position: {
        x: 50,
        y: 100,
      },
      startMarker: undefined,
      strokeColor: '#9e9e9e',
      type: 'path',
    });
  });

  it('should pan the canvas by touch and dragging the empty area', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const unselect = screen.getByTestId('unselect-element-layer');

    fireEvent.touchStart(unselect, {
      touches: [
        {
          clientX: 50,
          clientY: 100,
          isPrimary: true,
        },
      ],
    });

    vi.advanceTimersByTime(200);

    fireEvent.touchMove(unselect, {
      touches: [
        {
          clientX: 50 + 20,
          clientY: 100 + 20,
          isPrimary: true,
        },
      ],
    });

    vi.advanceTimersByTime(200);

    fireEvent.touchEnd(unselect, {
      touches: [],
    });

    vi.advanceTimersByTime(200);

    expect(svgScaleContextState.translation).toEqual({ x: 20, y: 20 });
  });

  it('should pan the canvas if we are touch-dragging a non-selected frame', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const frame = screen.getByTestId('element-frame-frame-0');

    fireEvent.touchStart(frame, {
      touches: [
        {
          clientX: 50,
          clientY: 100,
          isPrimary: true,
        },
      ],
    });

    vi.advanceTimersByTime(200);

    fireEvent.touchMove(frame, {
      touches: [
        {
          clientX: 50 + 20,
          clientY: 100 + 20,
          isPrimary: true,
        },
      ],
    });

    vi.advanceTimersByTime(200);

    fireEvent.touchEnd(frame, {
      touches: [],
    });

    vi.advanceTimersByTime(200);

    expect(svgScaleContextState.translation).toEqual({ x: 20, y: 20 });
  });

  it('should not pan the canvas if we are touch-dragging the selected frame', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    activeSlide.setActiveElementId('frame-0');

    const frame = screen.getByTestId('element-frame-frame-0');

    fireEvent.touchStart(frame, {
      touches: [
        {
          clientX: 50,
          clientY: 100,
          isPrimary: true,
        },
      ],
    });

    vi.advanceTimersByTime(200);

    fireEvent.touchMove(frame, {
      touches: [
        {
          clientX: 50 + 20,
          clientY: 100 + 20,
          isPrimary: true,
        },
      ],
    });

    vi.advanceTimersByTime(200);

    fireEvent.touchEnd(frame, {
      touches: [],
    });

    vi.advanceTimersByTime(200);

    expect(svgScaleContextState.translation).toEqual({ x: 0, y: 0 });
  });
});
