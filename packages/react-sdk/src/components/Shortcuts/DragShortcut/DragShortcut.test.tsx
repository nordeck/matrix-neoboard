/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType, PropsWithChildren } from 'react';
import { Mocked, afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils';
import {
  PathElement,
  WhiteboardInstance,
  WhiteboardManager,
} from '../../../state';
import { gridCellSize } from '../../Whiteboard';
import { WhiteboardHotkeysProvider } from '../../WhiteboardHotkeysProvider';
import { DragShortcut } from './DragShortcut';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<DragShortcut>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockEllipseElement({ position: { x: 100, y: 100 } })],
            ['element-1', mockEllipseElement({ position: { x: 200, y: 200 } })],
          ],
        ],
      ],
    }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

    Wrapper = ({ children }) => (
      <WhiteboardHotkeysProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      </WhiteboardHotkeysProvider>
    );
  });

  it('should move a selected element up with ArrowUp', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementIds(['element-0']);

    render(<DragShortcut />, { wrapper: Wrapper });

    await userEvent.keyboard('{ArrowUp}');

    expect(activeSlide.getElement('element-0')?.position).toEqual({
      x: 100,
      y: 100 - gridCellSize,
    });
  });

  it('should move a selected element down with ArrowDown', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementIds(['element-0']);

    render(<DragShortcut />, { wrapper: Wrapper });

    await userEvent.keyboard('{ArrowDown}');

    expect(activeSlide.getElement('element-0')?.position).toEqual({
      x: 100,
      y: 100 + gridCellSize,
    });
  });

  it('should move a selected element left with ArrowLeft', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementIds(['element-0']);

    render(<DragShortcut />, { wrapper: Wrapper });

    await userEvent.keyboard('{ArrowLeft}');

    expect(activeSlide.getElement('element-0')?.position).toEqual({
      x: 100 - gridCellSize,
      y: 100,
    });
  });

  it('should move a selected element right with ArrowRight', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementIds(['element-0']);

    render(<DragShortcut />, { wrapper: Wrapper });

    await userEvent.keyboard('{ArrowRight}');

    expect(activeSlide.getElement('element-0')?.position).toEqual({
      x: 100 + gridCellSize,
      y: 100,
    });
  });

  it('should move all selected elements together', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementIds(['element-0', 'element-1']);

    render(<DragShortcut />, { wrapper: Wrapper });

    await userEvent.keyboard('{ArrowDown}');

    expect(activeSlide.getElement('element-0')?.position).toEqual({
      x: 100,
      y: 100 + gridCellSize,
    });
    expect(activeSlide.getElement('element-1')?.position).toEqual({
      x: 200,
      y: 200 + gridCellSize,
    });
  });

  it('should move the connecting path endpoint when a connected shape moves', async () => {
    // element-0 at (100,100), element-1 at (200,200), connected by path-0
    // path-0: position=(100,100), points=[{0,0},{100,100}]
    // selecting element-0 and pressing ArrowDown:
    //   - element-0 moves to (100, 120)
    //   - path start (connected to element-0) moves to (100, 120)
    //   - path end (connected to element-1) stays at (200, 200)
    //   => path-0: position=(100,120), points=[{0,0},{100,80}]
    const { whiteboardManager: wm } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            [
              'element-0',
              mockEllipseElement({
                position: { x: 100, y: 100 },
                connectedPaths: ['path-0'],
              }),
            ],
            [
              'element-1',
              mockEllipseElement({
                position: { x: 200, y: 200 },
                connectedPaths: ['path-0'],
              }),
            ],
            [
              'path-0',
              mockLineElement({
                position: { x: 100, y: 100 },
                points: [
                  { x: 0, y: 0 },
                  { x: 100, y: 100 },
                ],
                connectedElementStart: 'element-0',
                connectedElementEnd: 'element-1',
              }),
            ],
          ],
        ],
      ],
    });
    const instance = wm.getActiveWhiteboardInstance()!;
    const slide = instance.getSlide('slide-0');
    slide.setActiveElementIds(['element-0']);

    const LocalWrapper: ComponentType<PropsWithChildren<{}>> = ({
      children,
    }) => (
      <WhiteboardHotkeysProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={wm}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      </WhiteboardHotkeysProvider>
    );

    render(<DragShortcut />, { wrapper: LocalWrapper });

    await userEvent.keyboard('{ArrowDown}');

    expect(slide.getElement('element-0')?.position).toEqual({
      x: 100,
      y: 100 + gridCellSize,
    });
    expect(slide.getElement('element-1')?.position).toEqual({
      x: 200,
      y: 200,
    });
    const path = slide.getElement('path-0') as PathElement;
    expect(path.position).toEqual({ x: 100, y: 100 + gridCellSize });
    expect(path.points).toEqual([
      { x: 0, y: 0 },
      { x: 100, y: 100 - gridCellSize },
    ]);
  });

  it('should not move elements when none are selected', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementIds([]);

    render(<DragShortcut />, { wrapper: Wrapper });

    await userEvent.keyboard('{ArrowUp}');

    expect(activeSlide.getElement('element-0')?.position).toEqual({
      x: 100,
      y: 100,
    });
  });
});
