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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockImageElement,
  mockLineElement,
  mockPolylineElement,
  mockRectangleElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../../../lib/testUtils';
import { Point, WhiteboardSlideInstance } from '../../../../state';
import { ConnectionPointProvider } from '../../../ConnectionPointProvider';
import { ElementOverridesProvider } from '../../../ElementOverridesProvider';
import { LayoutStateProvider } from '../../../Layout';
import { SvgCanvas } from '../../SvgCanvas';
import { RotateElement } from './RotateElement';

vi.mock('../../SvgCanvas/useMeasure', () => ({
  useMeasure: vi.fn().mockReturnValue([vi.fn(), { width: 1920, height: 1080 }]),
}));

vi.mock('../../SvgCanvas/utils', async () => ({
  ...(await vi.importActual('../../SvgCanvas/utils')),
  calculateSvgCoords: (position: Point) => position,
}));

describe('<RotateElement/>', () => {
  let widgetApi: MockedWidgetApi;
  let activeSlide: WhiteboardSlideInstance;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

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

  const imageElement = mockImageElement({
    rotation: 30,
  });
  const rectangleElement = mockRectangleElement();

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['poly', polylineElement],
            ['line', lineElement],
            ['image', imageElement],
            ['rectangle', rectangleElement],
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
            <ConnectionPointProvider>
              <SvgCanvas viewportWidth={1000} viewportHeight={1000}>
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

  it('should show a transparent overlay to keep the grab cursor when dragging', () => {
    activeSlide.setActiveElementIds(['image']);
    render(<RotateElement elementId={'image'} />, {
      wrapper: Wrapper,
    });

    const rotateHandle = screen.getByTestId('rotate-handle');

    const handlePos = {
      x: 500,
      y: 500,
    };

    fireEvent.mouseDown(rotateHandle, {
      clientX: 500,
      clientY: 500,
      buttons: 1,
    });

    expect(screen.getByTestId('rotate-handle-grab')).toBeInTheDocument();

    fireEvent.mouseMove(rotateHandle, {
      clientX: handlePos.x + 10,
      clientY: handlePos.y + 10,
      buttons: 1,
    });
    fireEvent.mouseUp(rotateHandle, {
      clientX: handlePos.x + 10,
      clientY: handlePos.y + 10,
      buttons: 1,
    });

    expect(screen.queryByTestId('rotate-handle-grab')).not.toBeInTheDocument();
  });

  it.each`
    angle  | deltaX  | deltaY
    ${0}   | ${0}    | ${0}
    ${1}   | ${0}    | ${10}
    ${6}   | ${0}    | ${100}
    ${10}  | ${0}    | ${200}
    ${359} | ${10}   | ${0}
    ${355} | ${100}  | ${0}
    ${0}   | ${100}  | ${100}
    ${353} | ${0}    | ${-100}
    ${7}   | ${-100} | ${0}
    ${0}   | ${-100} | ${-100}
  `(
    'should rotate to angle $angle when moving cursor delta $deltaX, $deltaY',
    ({ angle, deltaX, deltaY }) => {
      activeSlide.setActiveElementIds(['rectangle']);
      render(<RotateElement elementId={'rectangle'} />, {
        wrapper: Wrapper,
      });

      const rotateHandle = screen.getByTestId('rotate-handle');

      const handlePos = {
        x: 500,
        y: 500,
      };

      fireEvent.mouseDown(rotateHandle, {
        clientX: handlePos.x,
        clientY: handlePos.y,
        buttons: 1,
      });
      fireEvent.mouseMove(rotateHandle, {
        clientX: handlePos.x + deltaX,
        clientY: handlePos.y + deltaY,
        buttons: 1,
      });
      fireEvent.mouseUp(rotateHandle, {
        clientX: handlePos.x + deltaX,
        clientY: handlePos.y + deltaY,
        buttons: 1,
      });

      expect(activeSlide.getElement('rectangle')).toMatchObject({
        rotation: angle,
      });
    },
  );

  it.each`
    angle | deltaX  | deltaY
    ${30} | ${0}    | ${0}
    ${31} | ${0}    | ${10}
    ${36} | ${0}    | ${100}
    ${40} | ${0}    | ${200}
    ${29} | ${10}   | ${0}
    ${25} | ${100}  | ${0}
    ${23} | ${0}    | ${-100}
    ${37} | ${-100} | ${0}
    ${30} | ${-100} | ${-100}
  `(
    'should rotate to angle $angle when moving cursor delta $deltaX, $deltaY rotated to 30',
    ({ angle, deltaX, deltaY }) => {
      activeSlide.updateElements([
        {
          elementId: 'rectangle',
          patch: {
            rotation: 30,
          },
        },
      ]);
      activeSlide.setActiveElementIds(['rectangle']);
      render(<RotateElement elementId={'rectangle'} />, {
        wrapper: Wrapper,
      });

      const rotateHandle = screen.getByTestId('rotate-handle');

      const handlePos = {
        x: 500,
        y: 500,
      };

      fireEvent.mouseDown(rotateHandle, {
        clientX: handlePos.x,
        clientY: handlePos.y,
        buttons: 1,
      });
      fireEvent.mouseMove(rotateHandle, {
        clientX: handlePos.x + deltaX,
        clientY: handlePos.y + deltaY,
        buttons: 1,
      });
      fireEvent.mouseUp(rotateHandle, {
        clientX: handlePos.x + deltaX,
        clientY: handlePos.y + deltaY,
        buttons: 1,
      });

      expect(activeSlide.getElement('rectangle')).toMatchObject({
        rotation: angle,
      });
    },
  );

  it.each`
    angle | deltaX  | deltaY
    ${30} | ${0}    | ${0}
    ${31} | ${0}    | ${10}
    ${36} | ${0}    | ${100}
    ${40} | ${0}    | ${200}
    ${29} | ${10}   | ${0}
    ${23} | ${100}  | ${0}
    ${29} | ${100}  | ${100}
    ${22} | ${0}    | ${-100}
    ${38} | ${-100} | ${0}
    ${31} | ${-100} | ${-100}
  `(
    'should rotate to angle $angle when moving cursor delta $deltaX, $deltaY for 30deg image',
    ({ angle, deltaX, deltaY }) => {
      activeSlide.setActiveElementIds(['image']);
      render(<RotateElement elementId={'image'} />, {
        wrapper: Wrapper,
      });

      const rotateHandle = screen.getByTestId('rotate-handle');

      const handlePos = {
        x: 500,
        y: 500,
      };

      fireEvent.mouseDown(rotateHandle, {
        clientX: handlePos.x,
        clientY: handlePos.y,
        buttons: 1,
      });
      fireEvent.mouseMove(rotateHandle, {
        clientX: handlePos.x + deltaX,
        clientY: handlePos.y + deltaY,
        buttons: 1,
      });
      fireEvent.mouseUp(rotateHandle, {
        clientX: handlePos.x + deltaX,
        clientY: handlePos.y + deltaY,
        buttons: 1,
      });

      expect(activeSlide.getElement('image')).toMatchObject({
        rotation: angle,
      });
    },
  );

  it('should rotate both the rectangle and a line attached to it', () => {
    activeSlide.updateElement('line', {
      connectedElementStart: 'rectangle',
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 20 },
      ],
      position: { x: 30, y: 30 },
    });
    activeSlide.updateElement('rectangle', {
      connectedPaths: ['line'],
    });
    activeSlide.setActiveElementIds(['rectangle']);

    render(<RotateElement elementId={'rectangle'} />, {
      wrapper: Wrapper,
    });

    const rotateHandle = screen.getByTestId('rotate-handle');

    const handlePos = {
      x: 500,
      y: 500,
    };

    fireEvent.mouseDown(rotateHandle, {
      clientX: handlePos.x,
      clientY: handlePos.y,
      buttons: 1,
    });
    fireEvent.mouseMove(rotateHandle, {
      clientX: handlePos.x + 50,
      clientY: handlePos.y,
      buttons: 1,
    });
    fireEvent.mouseUp(rotateHandle, {
      clientX: handlePos.x + 50,
      clientY: handlePos.y,
      buttons: 1,
    });

    expect(activeSlide.getElement('rectangle')).toMatchObject({
      rotation: 357,
    });

    expect(activeSlide.getElement('line')).toMatchObject({
      points: [
        { x: 0, y: 0 },
        { x: expect.closeTo(21.11), y: expect.closeTo(20.23) },
      ],
      position: {
        x: expect.closeTo(28.89),
        y: expect.closeTo(29.77),
      },
    });
  });
});
