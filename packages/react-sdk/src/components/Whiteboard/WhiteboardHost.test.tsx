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
import { LayoutStateProvider, useLayoutState } from '../Layout';
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
      ({ setDragSelectStartCoords, setShowGrid } = useLayoutState());
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

  it('should select element with left button', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    fireEvent.mouseDown(element, {
      clientX: 50,
      clientY: 101,
      buttons: 1,
    });
    expect(activeSlide.getActiveElementIds()).toEqual(['element-0']);
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

  it('should select element with left button in the presentation mode if presenting', () => {
    setPresentationMode(true, false, 'presenting');

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    fireEvent.mouseDown(element, {
      clientX: 50,
      clientY: 101,
      buttons: 1,
    });
    expect(activeSlide.getActiveElementIds()).toEqual(['element-0']);
  });

  it('should select element with left button in the presentation mode if edit mode is enabled', () => {
    setPresentationMode(true, true);

    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    fireEvent.mouseDown(element, {
      clientX: 50,
      clientY: 101,
      buttons: 1,
    });
    expect(activeSlide.getActiveElementIds()).toEqual(['element-0']);
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
    fireEvent.mouseDown(element, {
      clientX: 150,
      clientY: 150,
      buttons: 1,
    });
    expect(activeSlide.getActiveElementIds()).toEqual(['element-0']);
    fireEvent.mouseMove(element, {
      clientX: 300,
      clientY: 400,
      buttons: 1,
    });
    fireEvent.mouseUp(element);

    expect(activeSlide.getElement('element-0')?.position).toEqual({
      x: 160,
      y: 260,
    });
  });

  it('should move the element to attach it to the frame', async () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    fireEvent.mouseDown(element, {
      clientX: 20,
      clientY: 20,
      buttons: 1,
    });
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
    fireEvent.mouseDown(element, {
      clientX: 20,
      clientY: 20,
      buttons: 1,
    });
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

  it('should move the element connected to line and attach both to frame', () => {
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
    fireEvent.mouseDown(element, {
      clientX: 20,
      clientY: 20,
      buttons: 1,
    });
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

  it('should move an attached element if the frame is moved', () => {
    render(<WhiteboardHost />, { wrapper: Wrapper });

    const element = screen.getByTestId('element-ellipse-element-0');
    fireEvent.mouseDown(element, {
      clientX: 20,
      clientY: 20,
      buttons: 1,
    });
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

    const frameElement = screen.getByTestId('element-frame-frame-0');
    fireEvent.mouseDown(frameElement, {
      clientX: 520,
      clientY: 520,
      buttons: 1,
    });
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

  it.each([
    ['right', 2, 2],
    ['middle', 1, 4],
  ])(
    'should not pan the infinite canvas by dragging element with the %s mouse button in presentation mode if edit mode is enabled',
    async (_, button, buttons) => {
      vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
        name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
      );

      vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
      vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
      vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

      setPresentationMode(true, true);

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

  it.each([
    ['right', 2],
    ['middle', 1],
  ])(
    'should pan the infinite canvas by dragging canvas with the %s mouse button',
    async (_, button) => {
      vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
      vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
      vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

      render(<WhiteboardHost />, { wrapper: Wrapper });

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

      expect(svgScaleContextState.translation).toEqual({ x: 150, y: 250 });
    },
  );

  it.each([
    ['right', 2],
    ['middle', 1],
  ])(
    'should not pan the infinite canvas by dragging canvas with the %s mouse button in presentation mode if edit mode is enabled',
    async (_, button) => {
      vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
        name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
      );

      vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
      vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
      vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

      setPresentationMode(true, true);

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
});
