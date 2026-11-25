/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockFrameElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../../lib/testUtils';
import { FrameElement, Point, WhiteboardSlideInstance } from '../../../state';
import { LayoutStateProvider, useLayoutState } from '../../Layout';
import { useSvgScaleContext } from '../../Whiteboard';
import { SvgCanvas } from '../../Whiteboard/SvgCanvas';
import * as svgUtils from '../../Whiteboard/SvgCanvas/utils';
import { SvgScaleContextType } from '../../Whiteboard/SvgScaleContext';
import FrameDisplay from './Display';

// Mock to avoid SVG native functions not available in the test context
vi.mock('../../Whiteboard/SvgCanvas/utils');

describe('<FrameDisplay />', () => {
  let widgetApi: MockedWidgetApi;
  let activeSlide: WhiteboardSlideInstance;
  let dragSelectStartCoords: Point | undefined;
  let svgScaleContextState: SvgScaleContextType;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    const { whiteboardManager } = mockWhiteboardManager();
    activeSlide = whiteboardManager
      .getActiveWhiteboardInstance()!
      .getSlide('slide-0');

    function LayoutStateExtractor() {
      ({ dragSelectStartCoords } = useLayoutState());
      return null;
    }

    function SvgScaleContextExtractor() {
      svgScaleContextState = useSvgScaleContext();
      return null;
    }

    Wrapper = ({ children }) => {
      return (
        <LayoutStateProvider>
          <LayoutStateExtractor />
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            <SvgScaleContextExtractor />
            <SvgCanvas viewportWidth={200} viewportHeight={200}>
              {children}
            </SvgCanvas>
          </WhiteboardTestingContextProvider>
        </LayoutStateProvider>
      );
    };
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should render as expected', () => {
    const element = mockFrameElement();
    render(
      <FrameDisplay
        elementId="element-0"
        activeElementIds={[]}
        elements={{}}
        {...element}
        active={false}
        readOnly={false}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(screen.getByTestId('element-frame-element-0'))
      .toMatchInlineSnapshot(`
      <g
        data-testid="element-frame-element-0"
      >
        <rect
          fill="#fff"
          height="100"
          stroke="#9e9e9e"
          stroke-width="2"
          width="200"
          x="10"
          y="20"
        />
      </g>
    `);
  });

  describe('drag select', () => {
    let frameElement: FrameElement;
    let frameId: string;

    beforeEach(() => {
      frameElement = mockFrameElement({
        position: { x: 0, y: 0 },
        width: 200,
        height: 200,
      });
      frameId = activeSlide.addElement(frameElement);
      // adding an element selects it
      activeSlide.setActiveElementId(undefined);

      vi.mocked(svgUtils.calculateSvgCoords).mockReturnValue({ x: 60, y: 60 });
    });

    function renderFrame(active: boolean) {
      render(
        <FrameDisplay
          elementId={frameId}
          active={active}
          readOnly={false}
          {...frameElement}
        />,
        { wrapper: Wrapper },
      );
    }

    function getFrame() {
      return screen.getByTestId(`element-frame-${frameId}`);
    }

    function pressAndMove(
      element: HTMLElement,
      pointerType: 'mouse' | 'pen' | 'touch',
    ) {
      fireEvent.pointerDown(element, {
        isPrimary: true,
        pointerType,
        button: 0,
        buttons: 1,
        clientX: 60,
        clientY: 60,
      });
      fireEvent.pointerMove(element, {
        isPrimary: true,
        pointerType,
        button: -1,
        buttons: 1,
        clientX: 65,
        clientY: 65,
      });
    }

    it.each(['mouse', 'pen'] as const)(
      'should start the drag select with %s above an unselected frame',
      (pointerType) => {
        renderFrame(false);
        const frame = getFrame();

        pressAndMove(frame, pointerType);

        expect(dragSelectStartCoords).toEqual({ x: 60, y: 60 });
      },
    );

    it.each(['mouse', 'pen'] as const)(
      'should not start the drag select with %s above a selected frame',
      (pointerType) => {
        activeSlide.setActiveElementIds([frameId]);
        renderFrame(true);
        const frame = getFrame();

        pressAndMove(frame, pointerType);

        expect(dragSelectStartCoords).toBeUndefined();
        expect(activeSlide.getActiveElementIds()).toEqual([frameId]);
      },
    );

    it('should not start the drag select with a touch above an unselected frame', () => {
      renderFrame(false);
      const frame = getFrame();

      pressAndMove(frame, 'touch');

      expect(dragSelectStartCoords).toBeUndefined();
      expect(activeSlide.getActiveElementIds()).toEqual([]);
    });

    it('should not start the drag select on small movements', () => {
      renderFrame(false);
      const frame = getFrame();

      fireEvent.pointerDown(frame, {
        isPrimary: true,
        pointerType: 'mouse',
        button: 0,
        buttons: 1,
        clientX: 60,
        clientY: 60,
      });
      fireEvent.pointerMove(frame, {
        isPrimary: true,
        pointerType: 'mouse',
        button: -1,
        buttons: 1,
        clientX: 61,
        clientY: 61,
      });

      expect(dragSelectStartCoords).toBeUndefined();
    });

    it('should not pan and drag select at the same time when using pen', () => {
      renderFrame(false);
      const frame = getFrame();
      const initialTranslation = svgScaleContextState.translation;

      // Like a browser, fire each pointer event followed by its compatibility
      // touch event (react-draggable doesn't listen to pointer events).
      fireEvent.pointerDown(frame, {
        isPrimary: true,
        pointerType: 'pen',
        button: 0,
        buttons: 1,
        clientX: 600,
        clientY: 600,
      });
      fireEvent.touchStart(frame, {
        touches: [{ identifier: 0, clientX: 600, clientY: 600 }],
      });

      fireEvent.pointerMove(frame, {
        isPrimary: true,
        pointerType: 'pen',
        button: -1,
        buttons: 1,
        clientX: 700,
        clientY: 750,
      });
      fireEvent.touchMove(frame, {
        touches: [{ identifier: 0, clientX: 700, clientY: 750 }],
      });

      // the pen started a drag select
      expect(dragSelectStartCoords).toEqual({ x: 60, y: 60 });

      fireEvent.pointerUp(frame, {
        isPrimary: true,
        pointerType: 'pen',
        button: 0,
        buttons: 0,
        clientX: 700,
        clientY: 750,
      });
      fireEvent.touchEnd(frame, {
        touches: [],
        changedTouches: [{ identifier: 0, clientX: 700, clientY: 750 }],
      });

      // pan and drag select should not happen at the same time
      expect(svgScaleContextState.translation).toEqual(initialTranslation);
    });
  });
});
