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
import { renderHook } from '@testing-library/react';
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
import { filterRecord } from '../../lib';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils';
import {
  FrameElement,
  WhiteboardManager,
  WhiteboardSlideInstance,
} from '../../state';
import * as whiteboardConstants from '../Whiteboard/constants';
import { useSvgScaleContext } from '../Whiteboard/SvgScaleContext/context';
import { useCreateFrame } from './useCreateFrame';

vi.mock('../Whiteboard/SvgScaleContext/context', async (importActual) => ({
  ...(await importActual()),
  useSvgScaleContext: vi.fn(),
}));

describe('useCreateFrame', () => {
  let widgetApi: MockedWidgetApi;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let slide: WhiteboardSlideInstance;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    // Enable infinite canvas mode for this test
    vi.spyOn(whiteboardConstants, 'infiniteCanvasMode', 'get').mockReturnValue(
      true,
    );
    vi.spyOn(whiteboardConstants, 'whiteboardWidth', 'get').mockReturnValue(
      19200,
    );
    vi.spyOn(whiteboardConstants, 'whiteboardHeight', 'get').mockReturnValue(
      10800,
    );

    widgetApi = mockWidgetApi();

    ({ whiteboardManager } = mockWhiteboardManager());
    slide = whiteboardManager
      .getActiveWhiteboardInstance()!
      .getSlide('slide-0');

    Wrapper = ({ children }) => {
      return (
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      );
    };
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should add a 1920 x 1080 px frame to the centre of the viewport', () => {
    // @ts-ignore
    vi.mocked(useSvgScaleContext).mockReturnValue({
      viewportCanvasCenter: {
        x: 3000,
        y: 4000,
      },
    });
    const { result } = renderHook(() => useCreateFrame(), {
      wrapper: Wrapper,
    });
    result.current.createFrame();

    const frames = selectFrameElements(slide);

    expect(frames).toHaveLength(1);
    expect(frames[0].width).toBe(1920);
    expect(frames[0].height).toBe(1080);
    expect(frames[0].position).toEqual({
      x: 3000 - 1920 / 2, // centre - frame width / 2
      y: 4000 - 1080 / 2,
    });
  });

  it("should place a second frame aligned with it' top left corner to the top right corner of the first one", () => {
    // @ts-ignore
    vi.mocked(useSvgScaleContext).mockReturnValue({
      viewportCanvasCenter: {
        x: 0,
        y: 0,
      },
    });
    const { result } = renderHook(() => useCreateFrame(), {
      wrapper: Wrapper,
    });
    result.current.createFrame();
    result.current.createFrame();

    const frames = selectFrameElements(slide);

    expect(frames).toHaveLength(2);

    // First frame, centred
    expect(frames[0].width).toBe(1920);
    expect(frames[0].height).toBe(1080);
    expect(frames[0].position).toEqual({
      x: 0,
      y: 0,
    });

    // Second frame, top left corner should be grid-size px right of the top right corner of the first frame
    expect(frames[1].width).toBe(1920);
    expect(frames[1].height).toBe(1080);
    expect(frames[1].position).toEqual({
      x: 1920 + whiteboardConstants.gridCellSize,
      y: 0,
    });
  });

  it.each([
    [
      'top',
      { x: 5000, y: 0 },
      {
        x: 5000 - 1920 / 2, // centre - frame width / 2
        y: 0,
      },
    ],
    [
      'top left',
      { x: 0, y: 0 },
      {
        x: 0,
        y: 0,
      },
    ],
    [
      'left',
      { x: 0, y: 3000 },
      {
        x: 0,
        y: 3000 - 1080 / 2,
      },
    ],
    [
      'bottom left',
      { x: 0, y: whiteboardConstants.whiteboardHeight },
      {
        x: 0,
        y: whiteboardConstants.whiteboardHeight - 1080 / 2,
      },
    ],
    [
      'bottom',
      { x: 5000, y: whiteboardConstants.whiteboardHeight },
      {
        x: 5000 - 1920 / 2,
        y: whiteboardConstants.whiteboardHeight - 1080 / 2,
      },
    ],
    [
      'bottom right',
      {
        x: whiteboardConstants.whiteboardWidth,
        y: whiteboardConstants.whiteboardHeight,
      },
      {
        x: whiteboardConstants.whiteboardWidth - 1920 / 2,
        y: whiteboardConstants.whiteboardHeight - 1080 / 2,
      },
    ],
    [
      'right',
      {
        x: whiteboardConstants.whiteboardWidth,
        y: 3000,
      },
      {
        x: whiteboardConstants.whiteboardWidth - 1920 / 2,
        y: 3000 - 1080 / 2,
      },
    ],
    [
      'top right',
      {
        x: whiteboardConstants.whiteboardWidth,
        y: 0,
      },
      {
        x: whiteboardConstants.whiteboardWidth - 1920 / 2,
        y: 0,
      },
    ],
  ])(
    'should place frames on the border, if they would go beyond the border (%s)',
    (_where, viewportCanvasCenter, expectedFramePosition) => {
      // @ts-ignore
      vi.mocked(useSvgScaleContext).mockReturnValue({
        viewportCanvasCenter,
      });
      const { result } = renderHook(() => useCreateFrame(), {
        wrapper: Wrapper,
      });
      result.current.createFrame();

      const frames = selectFrameElements(slide);

      expect(frames).toHaveLength(1);
      expect(frames[0].position).toEqual(expectedFramePosition);
    },
  );
});

function selectFrameElements(slide: WhiteboardSlideInstance): FrameElement[] {
  const allElements = slide.getElements(slide.getElementIds());
  const frameElements = filterRecord(allElements, (e) => e.type === 'frame');
  return Object.values(frameElements) as FrameElement[];
}
