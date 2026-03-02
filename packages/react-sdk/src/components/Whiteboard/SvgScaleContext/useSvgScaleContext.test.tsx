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

import { renderHook } from '@testing-library/react';
import { act, ComponentType, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as constants from '../constants';
import { whiteboardHeight, whiteboardWidth } from '../constants';
import { useSvgScaleContext } from './context';
import { SvgScaleContextProvider } from './SvgScaleContextProvider';

describe('useSvgScaleContext', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    Wrapper = ({ children }) => {
      return <SvgScaleContextProvider>{children}</SvgScaleContextProvider>;
    };
  });

  describe('in infinite-canvas mode', () => {
    beforeEach(() => {
      vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(true);
      vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
      vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);
    });

    it('should have a state initialized', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: 0, y: 0 },
          containerDimensions: {
            width: 0,
            height: 0,
          },
          viewportCanvasCenter: { x: 9600, y: 5400 },
        }),
      );
    });

    it('should set container dimensions', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: 0, y: 0 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 9600, y: 5400 },
        }),
      );
    });

    it('should set container dimensions to zeros', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 0, height: 0 });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: 0, y: 0 },
          containerDimensions: {
            width: 0,
            height: 0,
          },
          viewportCanvasCenter: { x: 9600, y: 5400 },
        }),
      );
    });

    it('should update translation', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateTranslation(20, 30);
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: 20, y: 30 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 9580, y: 5370 },
        }),
      );
    });

    it('should clamp translation when moved outside of board via top left', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateTranslation(9301, 5251);
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: 9300, y: 5250 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 300, y: 150 },
        }),
      );
    });

    it('should clamp translation when moved outside of board via bottom right', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateTranslation(-9301, -5251);
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: -9300, y: -5250 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 18900, y: 10650 },
        }),
      );
    });

    it('should not change translation when container dimensions are updated', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.setContainerDimensions({ width: 400, height: 200 });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: 0, y: 0 },
          containerDimensions: {
            width: 400,
            height: 200,
          },
          viewportCanvasCenter: { x: 9600, y: 5400 },
        }),
      );
    });

    it('should change translation when container dimensions are updated to show top left area outside of board', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateTranslation(9300, 5250);
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: 9300, y: 5250 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 300, y: 150 },
        }),
      );

      act(() => {
        result.current.setContainerDimensions({ width: 800, height: 400 });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: 9200, y: 5200 },
          containerDimensions: {
            width: 800,
            height: 400,
          },
          viewportCanvasCenter: { x: 400, y: 200 },
        }),
      );
    });

    it('should change translation when container dimensions are updated to show bottom right area outside of board', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateTranslation(-9300, -5250);
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: -9300, y: -5250 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 18900, y: 10650 },
        }),
      );

      act(() => {
        result.current.setContainerDimensions({ width: 800, height: 400 });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: -9200, y: -5200 },
          containerDimensions: {
            width: 800,
            height: 400,
          },
          viewportCanvasCenter: { x: 18800, y: 10600 },
        }),
      );
    });

    it('should set scale', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateScale(
          0.3,
          'set',
          result.current.viewportCanvasCenter,
        );
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.3,
          translation: { x: 0, y: 0 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 9600, y: 5400 },
        }),
      );
    });

    it('should add to scale', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateScale(
          -0.3,
          'add',
          result.current.viewportCanvasCenter,
        );
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.7,
          translation: { x: 0, y: 0 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 9600, y: 5400 },
        }),
      );
    });

    it('should not set scale below limit', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateScale(
          0.01,
          'set',
          result.current.viewportCanvasCenter,
        );
      });

      expect(result.current.scale).toBe(0.05);
    });

    it('should not set scale above limit', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateScale(
          5,
          'set',
          result.current.viewportCanvasCenter,
        );
      });

      expect(result.current.scale).toBe(4);
    });

    it('should not add to scale below limit', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateScale(
          -0.99,
          'add',
          result.current.viewportCanvasCenter,
        );
      });

      expect(result.current.scale).toBe(0.05);
    });

    it('should not add to scale above limit', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateScale(
          5,
          'add',
          result.current.viewportCanvasCenter,
        );
      });

      expect(result.current.scale).toBe(4);
    });

    it('should not set scale above container to whiteboard ratio over x axis', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        // set a bigger container to not hit hard scale limits
        result.current.setContainerDimensions({ width: 6000, height: 3000 });
      });

      // the ratio over x should be grater over y
      expect(
        result.current.containerDimensions.width / whiteboardWidth,
      ).toBeGreaterThan(
        result.current.containerDimensions.height / whiteboardHeight,
      );

      act(() => {
        // set scale to minimum
        result.current.updateScale(
          0.05,
          'set',
          result.current.viewportCanvasCenter,
        );
      });

      expect(result.current.scale).toBe(6000 / 19200);
    });

    it('should not set scale above container to whiteboard ratio over y axis', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        // set a bigger container to not hit hard scale limits
        result.current.setContainerDimensions({ width: 6000, height: 7000 });
      });

      // the ratio over y should be grater over x
      expect(
        result.current.containerDimensions.height / whiteboardHeight,
      ).toBeGreaterThan(
        result.current.containerDimensions.width / whiteboardWidth,
      );

      act(() => {
        // set scale to minimum
        result.current.updateScale(
          0.05,
          'set',
          result.current.viewportCanvasCenter,
        );
      });

      expect(result.current.scale).toBe(7000 / 10800);
    });

    it('should update translation and set scale', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateTranslation(20, 30);
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: 20, y: 30 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 9580, y: 5370 },
        }),
      );

      act(() => {
        result.current.updateScale(
          0.3,
          'set',
          result.current.viewportCanvasCenter,
        );
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.3,
          translation: { x: 6, y: 9 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 9580, y: 5370 },
        }),
      );
    });

    it('should set scale to origin', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateScale(0.3, 'set', {
          x: 9600 + 150,
          y: 5400 + 75,
        });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.3,
          translation: { x: 105, y: 52.5 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 9250, y: 5225 },
        }),
      );
    });

    it('should update translation and set scale to origin', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateTranslation(20, 30);
      });

      act(() => {
        result.current.updateScale(0.3, 'set', {
          x: result.current.viewportCanvasCenter.x + 150,
          y: result.current.viewportCanvasCenter.y + 75,
        });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.3,
          translation: { x: 111, y: 61.5 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 9230, y: 5195 },
        }),
      );
    });

    it('should update translation and set scale and clamp top left', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateTranslation(9300, 5250);
      });

      act(() => {
        result.current.updateScale(
          0.3,
          'set',
          result.current.viewportCanvasCenter,
        );
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.3,
          translation: { x: 2580, y: 1470 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 1000, y: 500 },
        }),
      );
    });

    it('should update translation and set scale and clamp bottom right', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateTranslation(-9301, -5251);
      });

      act(() => {
        result.current.updateScale(
          0.3,
          'set',
          result.current.viewportCanvasCenter,
        );
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.3,
          translation: { x: -2580, y: -1470 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 18200, y: 10300 },
        }),
      );
    });

    it('should update translation and set scale to origin and clamp top left', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateTranslation(9000, 5100);
      });

      act(() => {
        result.current.updateScale(0.3, 'set', {
          x: result.current.viewportCanvasCenter.x + 300,
          y: result.current.viewportCanvasCenter.y + 150,
        });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.3,
          translation: { x: 2580, y: 1470 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 1000, y: 500 },
        }),
      );
    });

    it('should update translation and set scale to origin and clamp bottom right', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateTranslation(-9301, -5251);
      });

      act(() => {
        result.current.updateScale(0.3, 'set', {
          x: result.current.viewportCanvasCenter.x - 300,
          y: result.current.viewportCanvasCenter.y - 150,
        });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.3,
          translation: { x: -2580, y: -1470 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 18200, y: 10300 },
        }),
      );
    });

    it('should change translation when scaled and container dimensions are updated to show top left area outside of board', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateTranslation(9300, 5250);
      });

      act(() => {
        result.current.updateScale(
          0.3,
          'set',
          result.current.viewportCanvasCenter,
        );
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.3,
          translation: { x: 2580, y: 1470 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 1000, y: 500 },
        }),
      );

      act(() => {
        result.current.setContainerDimensions({ width: 810, height: 450 });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.3,
          translation: { x: 2475, y: 1395 },
          containerDimensions: {
            width: 810,
            height: 450,
          },
          viewportCanvasCenter: { x: 1350, y: 750 },
        }),
      );
    });

    it('should change translation when scaled and container dimensions are updated to show bottom right area outside of board', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 600, height: 300 });
      });

      act(() => {
        result.current.updateTranslation(-9300, -5250);
      });

      act(() => {
        result.current.updateScale(
          0.3,
          'set',
          result.current.viewportCanvasCenter,
        );
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.3,
          translation: { x: -2580, y: -1470 },
          containerDimensions: {
            width: 600,
            height: 300,
          },
          viewportCanvasCenter: { x: 18200, y: 10300 },
        }),
      );

      act(() => {
        result.current.setContainerDimensions({ width: 810, height: 450 });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.3,
          translation: { x: -2475, y: -1395 },
          containerDimensions: {
            width: 810,
            height: 450,
          },
          viewportCanvasCenter: { x: 17850, y: 10050 },
        }),
      );
    });
  });

  describe('in finite canvas mode', () => {
    beforeEach(() => {
      vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(false);
      vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(1920);
      vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(1080);
    });

    it('should have a state initialized', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: 0, y: 0 },
          containerDimensions: {
            width: 0,
            height: 0,
          },
          viewportCanvasCenter: { x: 960, y: 540 },
        }),
      );
    });

    it('should set container dimensions to board size and change scale to 1', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 1920, height: 1080 });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 1,
          translation: { x: 0, y: 0 },
          containerDimensions: {
            width: 1920,
            height: 1080,
          },
          viewportCanvasCenter: { x: 960, y: 540 },
        }),
      );
    });

    it('should set container dimensions to half of board size and change scale to 0.5', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 960, height: 540 });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 0.5,
          translation: { x: 0, y: 0 },
          containerDimensions: {
            width: 960,
            height: 540,
          },
          viewportCanvasCenter: { x: 960, y: 540 },
        }),
      );
    });

    it('should set container dimensions to twice of board size and change scale to 2', () => {
      const { result } = renderHook(() => useSvgScaleContext(), {
        wrapper: Wrapper,
      });

      act(() => {
        result.current.setContainerDimensions({ width: 3840, height: 2160 });
      });

      expect(result.current).toEqual(
        expect.objectContaining({
          scale: 2,
          translation: { x: 0, y: 0 },
          containerDimensions: {
            width: 3840,
            height: 2160,
          },
          viewportCanvasCenter: { x: 960, y: 540 },
        }),
      );
    });
  });
});
