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
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act, ComponentType, PropsWithChildren } from 'react';
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
  mockLineElement,
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
import * as constants from './constants';
import { SvgScaleContextType, useSvgScaleContext } from './SvgScaleContext';

vi.mock('./SvgCanvas/useMeasure', () => ({
  useMeasure: vi.fn().mockReturnValue([vi.fn(), { width: 1920, height: 1080 }]),
}));

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

describe('<WhiteboardHost/>', () => {
  let activeWhiteboard: WhiteboardInstance;
  let activeSlide: WhiteboardSlideInstance;
  let setDragSelectStartCoords: (point: Point | undefined) => void;
  let setShowGrid: (value: boolean) => void;
  let setActiveTool: (value: ActiveTool) => void;
  let svgScaleContextState: SvgScaleContextType;
  let widgetApi: MockedWidgetApi;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let setPresentationMode: (
    enable: boolean,
    enableEdit?: boolean,
    presentationType?: 'presentation' | 'presenting',
  ) => void;

  beforeEach(() => {
    vi.mocked(getEnvironment).mockImplementation(
      (_, defaultValue) => defaultValue,
    );

    document.elementsFromPoint = vi.fn().mockReturnValue([]);

    widgetApi = mockWidgetApi();

    ({ whiteboardManager, setPresentationMode } = mockWhiteboardManager({
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
      ({ setDragSelectStartCoords, setShowGrid, setActiveTool } =
        useLayoutState());
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

    vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(false);
    vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(1920);
    vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(1080);
  });

  afterEach(() => {
    widgetApi.stop();

    vi.useRealTimers();
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

  it('should resize element', () => {
    activeSlide.setActiveElementIds(['element-0']);
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('resize-handle-bottomRight');
    fireEvent.mouseDown(element, {
      clientX: 50,
      clientY: 101,
      buttons: 1,
    });
    fireEvent.mouseMove(element, {
      clientX: 100,
      clientY: 151,
      buttons: 1,
    });
    fireEvent.mouseUp(element);
    expect(activeSlide.getElement('element-0')).toEqual(
      expect.objectContaining({
        position: {
          x: 0,
          y: 1,
        },
        width: 100,
        height: 159,
      }),
    );
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

    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(
        screen.getByTestId(`element-0-border-${side}`),
      ).toBeInTheDocument();
    }
  });

  it('should select element with left button down', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: element,
      },
    ]);
    expect(activeSlide.getActiveElementIds()).toEqual(['element-0']);
  });

  it('should not select frame element with left button down', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-frame-frame-0');
    await userEvent.pointer({
      keys: '[MouseLeft>]',
      target: element,
    });
    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  it('should select frame element with left button down and up', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-frame-frame-0');
    await userEvent.pointer({
      keys: '[MouseLeft]',
      target: element,
    });
    expect(activeSlide.getActiveElementIds()).toEqual(['frame-0']);
  });

  it('should not select frame element with left button down move and up', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-frame-frame-0');
    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: element,
      },
      {
        pointerName: 'mouse',
        target: element,
        coords: { clientX: 10, clientY: 10 },
      },
      {
        keys: '[/MouseLeft]',
        target: element,
      },
    ]);
    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  it('should unselect elements when another frame element left button down', async () => {
    activeSlide.setActiveElementId('element-0');
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-frame-frame-0');
    await userEvent.pointer({
      keys: '[MouseLeft>]',
      target: element,
    });
    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  it('should unselect elements and not select frame when another frame element left button down and up', async () => {
    activeSlide.setActiveElementId('element-0');
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-frame-frame-0');
    await userEvent.pointer({
      keys: '[MouseLeft]',
      target: element,
    });
    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  it('should select element with touch press and release', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');

    await userEvent.pointer([
      {
        keys: '[TouchA]',
        target: element,
      },
    ]);

    expect(activeSlide.getActiveElementIds()).toEqual(['element-0']);
  });

  it('should not select element with touch press', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');

    await userEvent.pointer([
      {
        keys: '[TouchA>]',
        target: element,
      },
    ]);

    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  it('should not select element with touch press wait and release', async () => {
    vi.useFakeTimers({
      shouldAdvanceTime: true,
    });

    const user = userEvent.setup({
      delay: 400,
      advanceTimers: vi.advanceTimersByTime,
    });

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');

    await user.pointer([
      {
        keys: '[TouchA>]',
        target: element,
      },
      {
        keys: '[/TouchA]',
        target: element,
      },
    ]);

    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  it('should not select element with multi touch press and single release', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');

    await userEvent.pointer([
      {
        keys: '[TouchA>]',
        target: element,
      },
      {
        keys: '[TouchB>]',
        target: element,
      },
      {
        keys: '[/TouchA]',
        target: element,
      },
    ]);

    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  it('should scale with two pointers', async () => {
    vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
    vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
    vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('touch-zoom-handler');

    await userEvent.pointer([
      {
        keys: '[TouchA>]',
        target: element,
        coords: { clientX: 100, clientY: 100 },
      },
      {
        keys: '[TouchB>]',
        target: element,
        coords: { clientX: 300, clientY: 300 },
      },
      {
        pointerName: 'TouchA',
        target: element,
        coords: { clientX: 150, clientY: 150 },
      },
      {
        pointerName: 'TouchB',
        target: element,
        coords: { clientX: 250, clientY: 250 },
      },
      {
        keys: '[/TouchA]',
        target: element,
      },
      {
        keys: '[/TouchB]',
        target: element,
      },
    ]);

    expect(svgScaleContextState).toMatchObject({
      scale: 0.5,
      translation: {
        x: -3840,
        y: -2160,
      },
    });
  });

  it('should add a connector line', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    act(() => setActiveTool('line'));

    const draftHandler = screen.getByTestId('draft-mouse-handler');

    await userEvent.pointer([
      {
        keys: '[TouchA>]',
        target: draftHandler,
        coords: { clientX: 50, clientY: 101 },
      },
      {
        pointerName: 'TouchA',
        target: draftHandler,
        coords: { clientX: 50 + 20, clientY: 100 + 20 },
      },
      {
        keys: '[/TouchA]',
        target: draftHandler,
      },
    ]);

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

  it('should draw with the pencil tool', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    act(() => setActiveTool('polyline'));

    const draftHandler = screen.getByTestId('draft-mouse-handler');

    await userEvent.pointer([
      {
        keys: '[TouchA>]',
        target: draftHandler,
        coords: { clientX: 50, clientY: 100 },
      },
      {
        pointerName: 'TouchA',
        target: draftHandler,
        coords: { clientX: 50 + 20, clientY: 100 + 20 },
      },
      {
        pointerName: 'TouchA',
        target: draftHandler,
        coords: { clientX: 50, clientY: 100 + 40 },
      },
      {
        keys: '[/TouchA]',
        target: draftHandler,
      },
    ]);

    const line = activeSlide.getElement(activeSlide.getActiveElementIds()[0]);

    expect(line).toEqual({
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

  it('should pan the canvas by touch and dragging the empty area', async () => {
    vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
    vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
    vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const unselect = screen.getByTestId('unselect-element-layer');

    await userEvent.pointer([
      {
        keys: '[TouchA>]',
        target: unselect,
        coords: { clientX: 50, clientY: 100 },
      },
      {
        pointerName: 'TouchA',
        target: unselect,
        coords: { clientX: 50 + 20, clientY: 100 + 20 },
      },
      {
        keys: '[/TouchA]',
        target: unselect,
      },
    ]);

    expect(svgScaleContextState.translation).toEqual({ x: 20, y: 20 });
  });

  it('should not pan the canvas if we are touch-dragging the selected frame', async () => {
    vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
    vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
    vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

    activeSlide.setActiveElementId('frame-0');

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const frame = screen.getByTestId('element-frame-frame-0');

    await userEvent.pointer([
      {
        keys: '[TouchA>]',
        target: frame,
        coords: { clientX: 50, clientY: 100 },
      },
      {
        pointerName: 'TouchA',
        target: frame,
        coords: { clientX: 50 + 20, clientY: 100 + 20 },
      },
      {
        keys: '[/TouchA]',
        target: frame,
      },
    ]);
    expect(svgScaleContextState.translation).toEqual({ x: 0, y: 0 });
  });

  it('should not select element with left button in the presentation mode', () => {
    setPresentationMode(true);

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    fireEvent.mouseDown(element, {
      clientX: 50,
      clientY: 101,
      buttons: 1,
    });
    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  it('should select element with left button in the presentation mode if presenting', async () => {
    setPresentationMode(true, false, 'presenting');

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: element,
        coords: { clientX: 50, clientY: 101 },
      },
    ]);
    expect(activeSlide.getActiveElementIds()).toEqual(['element-0']);
  });

  it('should select element with left button in the presentation mode if edit mode is enabled', async () => {
    setPresentationMode(true, true);

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: element,
        coords: { clientX: 50, clientY: 101 },
      },
    ]);
    expect(activeSlide.getActiveElementIds()).toEqual(['element-0']);
  });

  it('should select an element attached to active frame with left button in infinite canvas mode in the presentation mode if edit mode is enabled', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    // attached existing element to new frame
    activeSlide.updateElements([
      {
        elementId: 'frame-0',
        patch: {
          attachedElements: ['element-0'],
        },
      },
      {
        elementId: 'element-0',
        patch: {
          attachedFrame: 'frame-0',
        },
      },
    ]);

    setPresentationMode(true, true);

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: element,
        coords: { clientX: 50, clientY: 101 },
      },
    ]);
    expect(activeSlide.getActiveElementIds()).toEqual(['element-0']);
  });

  it('should not select an element without frame with left button in infinite canvas mode in the presentation mode if edit mode is enabled', () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    setPresentationMode(true, true);

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    fireEvent.mouseDown(element, {
      clientX: 50,
      clientY: 101,
      buttons: 1,
    });
    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  it('should not select an element attached to non active frame with left button in infinite canvas mode in the presentation mode if edit mode is enabled', () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    // create one more frame
    const frameId1 = activeSlide.addElement(mockFrameElement());

    // attached existing element to new frame
    activeSlide.updateElements([
      {
        elementId: frameId1,
        patch: {
          attachedElements: ['element-0'],
        },
      },
      {
        elementId: 'element-0',
        patch: {
          attachedFrame: frameId1,
        },
      },
    ]);

    setPresentationMode(true, true);

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    fireEvent.mouseDown(element, {
      clientX: 50,
      clientY: 101,
      buttons: 1,
    });
    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  it('should not select a frame element with left button in infinite canvas mode in the presentation mode if edit mode is enabled', () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    setPresentationMode(true, true);

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-frame-frame-0');
    fireEvent.mouseDown(element, {
      clientX: 50,
      clientY: 101,
      buttons: 1,
    });
    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  it('should move element by dragging with left button', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    // move 150px on x and 250px on y axis
    const element = screen.getByTestId('element-ellipse-element-0');

    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: element,
        coords: { clientX: 150, clientY: 150 },
      },
      {
        pointerName: 'mouse',
        target: element,
        coords: { clientX: 300, clientY: 400 },
      },
      { keys: '[/MouseLeft]', target: element },
    ]);

    expect(activeSlide.getActiveElementIds()).toEqual(['element-0']);

    expect(activeSlide.getElement('element-0')?.position).toEqual({
      x: 160,
      y: 260,
    });
  });

  it('should move the element to attach it to the frame', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: element,
        coords: { clientX: 20, clientY: 20 },
      },
    ]);
    fireEvent.mouseMove(element, {
      clientX: 560,
      clientY: 560,
      buttons: 1,
    });
    fireEvent.mouseUp(element);

    expect(activeSlide.getElement('frame-0')).toEqual(
      expect.objectContaining({
        attachedElements: ['element-0'],
      }),
    );
    expect(activeSlide.getElement('element-0')).toEqual(
      expect.objectContaining({
        position: {
          x: 540,
          y: 540,
        },
        attachedFrame: 'frame-0',
      }),
    );
  });

  it('should move the element to detach it from the frame', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: element,
        coords: { clientX: 20, clientY: 20 },
      },
    ]);
    fireEvent.mouseMove(element, {
      clientX: 560,
      clientY: 560,
      buttons: 1,
    });
    fireEvent.mouseUp(element);

    expect(activeSlide.getElement('frame-0')).toEqual(
      expect.objectContaining({
        attachedElements: ['element-0'],
      }),
    );
    expect(activeSlide.getElement('element-0')).toEqual(
      expect.objectContaining({
        position: {
          x: 540,
          y: 540,
        },
        attachedFrame: 'frame-0',
      }),
    );

    fireEvent.mouseDown(element, {
      clientX: 560,
      clientY: 560,
      buttons: 1,
    });
    fireEvent.mouseMove(element, {
      clientX: 40,
      clientY: 40,
      buttons: 1,
    });
    fireEvent.mouseUp(element);

    expect(activeSlide.getElement('frame-0')).toEqual(
      expect.objectContaining({
        attachedElements: undefined,
      }),
    );
    expect(activeSlide.getElement('element-0')).toEqual(
      expect.objectContaining({
        position: {
          x: 20,
          y: 20,
        },
        attachedFrame: undefined,
      }),
    );
  });

  it('should move the element connected to line and attach both to frame', async () => {
    const lineElementId = activeSlide.addElement(
      mockLineElement({
        points: [
          { x: 0, y: 1 },
          { x: 600, y: 600 }, // the point is within the frame
        ],
      }),
    );
    activeSlide.updateElements([
      {
        elementId: 'element-0',
        patch: {
          connectedPaths: [lineElementId],
        },
      },
      {
        elementId: lineElementId,
        patch: {
          connectedElementStart: 'element-0',
        },
      },
    ]);

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: element,
        coords: { clientX: 20, clientY: 20 },
      },
    ]);
    fireEvent.mouseMove(element, {
      clientX: 560,
      clientY: 560,
      buttons: 1,
    });
    fireEvent.mouseUp(element);

    expect(activeSlide.getElement('frame-0')).toEqual(
      expect.objectContaining({
        attachedElements: ['element-0', lineElementId],
      }),
    );
    expect(activeSlide.getElement('element-0')).toEqual(
      expect.objectContaining({
        position: {
          x: 540,
          y: 540,
        },
        attachedFrame: 'frame-0',
      }),
    );
    expect(activeSlide.getElement(lineElementId)).toEqual(
      expect.objectContaining({
        attachedFrame: 'frame-0',
      }),
    );
  });

  it('should move an attached element if the frame is selected and moved', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: element,
        coords: { clientX: 20, clientY: 20 },
      },
    ]);
    fireEvent.mouseMove(element, {
      clientX: 560,
      clientY: 560,
      buttons: 1,
    });
    fireEvent.mouseUp(element);

    expect(activeSlide.getElement('frame-0')).toEqual(
      expect.objectContaining({
        attachedElements: ['element-0'],
      }),
    );
    expect(activeSlide.getElement('element-0')).toEqual(
      expect.objectContaining({
        position: {
          x: 540,
          y: 540,
        },
        attachedFrame: 'frame-0',
      }),
    );

    act(() => {
      activeSlide.setActiveElementId('frame-0');
    });

    const frameElement = screen.getByTestId('element-frame-frame-0');
    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: frameElement,
        coords: { clientX: 520, clientY: 520 },
      },
    ]);
    fireEvent.mouseMove(frameElement, {
      clientX: 40,
      clientY: 40,
      buttons: 1,
    });
    fireEvent.mouseUp(frameElement);

    expect(activeSlide.getElement('frame-0')).toEqual(
      expect.objectContaining({
        position: {
          x: 20,
          y: 20,
        },
        attachedElements: ['element-0'],
      }),
    );
    expect(activeSlide.getElement('element-0')).toEqual(
      expect.objectContaining({
        position: {
          x: 60,
          y: 60,
        },
        attachedFrame: 'frame-0',
      }),
    );
  });

  it('should resize the frame and attach the element', () => {
    activeSlide.setActiveElementIds(['frame-0']);
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('resize-handle-topLeft');
    fireEvent.mouseDown(element, {
      clientX: 500,
      clientY: 500,
      buttons: 1,
    });
    fireEvent.mouseMove(element, {
      clientX: 200,
      clientY: 200,
      buttons: 1,
    });
    fireEvent.mouseUp(element);

    expect(activeSlide.getElement('frame-0')).toEqual(
      expect.objectContaining({
        position: {
          x: 200,
          y: 200,
        },
        attachedElements: ['element-1'],
      }),
    );
    expect(activeSlide.getElement('element-1')).toEqual(
      expect.objectContaining({
        position: {
          x: 200,
          y: 200,
        },
        attachedFrame: 'frame-0',
      }),
    );
  });

  it('should resize the frame and detach the element', () => {
    activeSlide.setActiveElementIds(['frame-0']);
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('resize-handle-topLeft');
    fireEvent.mouseDown(element, {
      clientX: 500,
      clientY: 500,
      buttons: 1,
    });
    fireEvent.mouseMove(element, {
      clientX: 200,
      clientY: 200,
      buttons: 1,
    });
    fireEvent.mouseUp(element);

    expect(activeSlide.getElement('frame-0')).toEqual(
      expect.objectContaining({
        position: {
          x: 200,
          y: 200,
        },
        attachedElements: ['element-1'],
      }),
    );
    expect(activeSlide.getElement('element-1')).toEqual(
      expect.objectContaining({
        position: {
          x: 200,
          y: 200,
        },
        attachedFrame: 'frame-0',
      }),
    );

    fireEvent.mouseDown(element, {
      clientX: 200,
      clientY: 200,
      buttons: 1,
    });
    fireEvent.mouseMove(element, {
      clientX: 500,
      clientY: 500,
      buttons: 1,
    });
    fireEvent.mouseUp(element);

    expect(activeSlide.getElement('frame-0')).toEqual(
      expect.objectContaining({
        position: {
          x: 500,
          y: 500,
        },
        attachedElements: undefined,
      }),
    );
    expect(activeSlide.getElement('element-1')).toEqual(
      expect.objectContaining({
        position: {
          x: 200,
          y: 200,
        },
        attachedFrame: undefined,
      }),
    );
  });

  it.each([
    ['right', 2, 2],
    ['middle', 1, 4],
  ])(
    'should pan the infinite canvas by dragging element with the %s mouse button',
    async (_, button, buttons) => {
      vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
      vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
      vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

      render(<WhiteboardHost />, { wrapper: Wrapper });

      // move 150px on x and 250px on y axis
      const element = screen.getByTestId('element-ellipse-element-0');
      fireEvent.mouseDown(element, {
        clientX: 150,
        clientY: 150,
        button,
        buttons,
      });
      fireEvent.mouseMove(element, {
        clientX: 300,
        clientY: 400,
        buttons,
      });
      fireEvent.mouseUp(element, {
        clientX: 300,
        clientY: 400,
        button,
      });

      expect(activeSlide.getActiveElementIds()).toEqual([]);
      expect(activeSlide.getElement('element-0')?.position).toEqual({
        x: 0,
        y: 1,
      });
      expect(svgScaleContextState.translation).toEqual({ x: 150, y: 250 });
    },
  );

  it.each<{ type: 'presenting' | 'presentation'; isEditMode: boolean }>([
    { type: 'presentation', isEditMode: false },
    { type: 'presentation', isEditMode: true },
    { type: 'presenting', isEditMode: false },
    { type: 'presenting', isEditMode: true },
  ])(
    'should not pan the infinite canvas by dragging element with the right mouse button in presentation mode type $type and edit mode is $isEditMode',
    async ({ type: presentationType, isEditMode }) => {
      const button = 2;
      const buttons = 2;

      vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
        name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
      );

      vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
      vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
      vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

      setPresentationMode(true, isEditMode, presentationType);

      render(<WhiteboardHost />, { wrapper: Wrapper });

      const initialTranslation = svgScaleContextState.translation;

      // move 150px on x and 250px on y axis
      const element = screen.getByTestId('element-ellipse-element-0');
      fireEvent.mouseDown(element, {
        clientX: 150,
        clientY: 150,
        button,
        buttons,
      });
      fireEvent.mouseMove(element, {
        clientX: 300,
        clientY: 400,
        buttons,
      });
      fireEvent.mouseUp(element, {
        clientX: 300,
        clientY: 400,
        button,
      });

      expect(activeSlide.getActiveElementIds()).toEqual([]);
      expect(activeSlide.getElement('element-0')?.position).toEqual({
        x: 0,
        y: 1,
      });
      expect(svgScaleContextState.translation).toBe(initialTranslation);
    },
  );

  it.each(['MouseRight', 'MouseMiddle'])(
    'should pan the infinite canvas by dragging canvas with the %s mouse button',
    async (mouseButton) => {
      vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
      vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
      vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

      render(<WhiteboardHost />, { wrapper: Wrapper });

      const element = screen.getByTestId('unselect-element-layer');
      await userEvent.pointer([
        {
          keys: `[${mouseButton}>]`,
          target: element,
          coords: { clientX: 150, clientY: 150 },
        },
        {
          pointerName: 'mouse',
          target: element,
          coords: { clientX: 300, clientY: 400 },
        },
        {
          keys: `[/${mouseButton}]`,
          target: element,
        },
      ]);

      expect(svgScaleContextState.translation).toEqual({ x: 150, y: 250 });
    },
  );

  it.each<{ type: 'presenting' | 'presentation'; isEditMode: boolean }>([
    { type: 'presentation', isEditMode: true },
    { type: 'presenting', isEditMode: true },
    { type: 'presenting', isEditMode: false },
  ])(
    'should not pan the infinite canvas by dragging canvas with the right mouse button in presentation mode type $type if edit mode is $isEditMode',
    async ({ type: presentationType, isEditMode }) => {
      const button = 2;

      vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
        name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
      );

      vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
      vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
      vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

      setPresentationMode(true, isEditMode, presentationType);

      render(<WhiteboardHost />, { wrapper: Wrapper });

      const initialTranslation = svgScaleContextState.translation;

      const element = screen.getByTestId('unselect-element-layer');
      fireEvent.mouseDown(element, {
        clientX: 150,
        clientY: 150,
        button,
      });
      fireEvent.mouseMove(element, {
        clientX: 300,
        clientY: 400,
      });
      fireEvent.mouseUp(element);

      expect(svgScaleContextState.translation).toBe(initialTranslation);
    },
  );

  it("should not pan the infinite canvas by dragging canvas with the right mouse button in presentation mode type 'presentation' if edit mode is not active", async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
    vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
    vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

    setPresentationMode(true, false);

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.queryByTestId('unselect-element-layer');
    expect(element).not.toBeInTheDocument();
  });

  it('should move multiple selected elements by dragging the border', () => {
    activeSlide.setActiveElementIds(['element-0', 'element-1']);
    render(<WhiteboardHost />, { wrapper: Wrapper });

    // move 150px on x and 250px on y axis
    const border = screen.getByTestId('element-0-border-top');
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
      y: 260,
    });
    expect(activeSlide.getElement('element-1')?.position).toEqual({
      x: 360,
      y: 460,
    });
  });

  it('should not contain an element border if no element is selected', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(
        screen.queryByTestId(`element-0-border-${side}`),
      ).not.toBeInTheDocument();
    }
  });

  it('should show the grid for the presenter in presentation mode if it is enabled', () => {
    setShowGrid(true);
    activeWhiteboard.getPresentationManager()?.startPresentation();

    render(<WhiteboardHost />, { wrapper: Wrapper });

    expect(screen.getByTestId('grid')).toBeInTheDocument();
  });

  it('should show selection rotated if a rotated element is selected', () => {
    activeSlide.setActiveElementIds(['element-0']);
    activeSlide.updateElement('element-0', {
      rotation: 45,
    });

    render(<WhiteboardHost />, { wrapper: Wrapper });

    expect(
      screen.getByTestId('selection-anchors-shape').getAttribute('transform'),
    ).toBe('rotate(45 25 51)');
    expect(
      screen
        .getByTestId('selection-solid-line-borders')
        .getAttribute('transform'),
    ).toBe('rotate(45 25 51)');
  });

  it('should show the resize handles rotated if a rotated element is selected', () => {
    activeSlide.setActiveElementIds(['element-0']);
    activeSlide.updateElement('element-0', {
      rotation: 45,
    });

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const el = screen.getByTestId('resize-element');
    expect(el).toBeInTheDocument();
    expect(el.getAttribute('transform')).toBe(
      'translate(0 1) rotate(45 25 50)',
    );
  });

  it('should show thin selection outline rotated in multi-select', () => {
    activeSlide.setActiveElementIds(['element-0', 'element-1']);
    activeSlide.updateElement('element-0', {
      rotation: 45,
    });
    activeSlide.updateElement('element-1', {
      rotation: 45,
    });
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const e0 = screen.queryByTestId(`element-element-0-outline`);
    const e1 = screen.queryByTestId(`element-element-1-outline`);

    expect(e0).toBeInTheDocument();
    expect(e1).toBeInTheDocument();
    expect(e0?.getAttribute('transform')).toBe('rotate(45 25 51)');
    expect(e1?.getAttribute('transform')).toBe('rotate(45 225 250)');
  });

  it('should show rotation handle', () => {
    activeSlide.setActiveElementIds(['element-0']);
    render(<WhiteboardHost />, { wrapper: Wrapper });

    expect(screen.getByTestId(`rotate-handle`)).toBeInTheDocument();
  });

  it('should not show rotation handle when multiple elements are selected', () => {
    activeSlide.setActiveElementIds(['element-0', 'element-1']);
    render(<WhiteboardHost />, { wrapper: Wrapper });

    expect(screen.queryByTestId(`rotate-handle`)).not.toBeInTheDocument();
  });

  it.each<{
    type: 'presenting' | 'presentation';
    isEditMode: boolean;
  }>([
    { type: 'presentation', isEditMode: true },
    { type: 'presenting', isEditMode: true },
    { type: 'presenting', isEditMode: false },
  ])(
    'should show the rotation handle in presentation mode type $type if edit mode is $isEditMode',
    async ({ type: presentationType, isEditMode }) => {
      setPresentationMode(true, isEditMode, presentationType);

      activeSlide.setActiveElementIds(['element-0']);
      render(<WhiteboardHost />, { wrapper: Wrapper });

      expect(screen.getByTestId(`rotate-handle`)).toBeInTheDocument();
    },
  );

  it('should hide the rotation handle in presentation mode type presentation if edit mode is false', async () => {
    setPresentationMode(true, false, 'presentation');

    activeSlide.setActiveElementIds(['element-0']);
    render(<WhiteboardHost />, { wrapper: Wrapper });

    expect(screen.queryByTestId(`rotate-handle`)).not.toBeInTheDocument();
  });
});
