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

import { act, renderHook } from '@testing-library/react';
import {
  ComponentType,
  PropsWithChildren,
  RefObject,
  useRef,
  WheelEvent,
} from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockedFunction,
  vi,
} from 'vitest';
import { isMacOS } from '../../common/platform';
import { useSvgScaleContext } from '../SvgScaleContext';
import { useWheelZoom } from './useWheelZoom';
import { calculateSvgCoords } from './utils';

// Mock dependencies
vi.mock('../../common/platform');
vi.mock('../SvgScaleContext');
vi.mock('./utils');

// Mock constants
vi.mock('../constants', () => ({
  zoomStep: 0.1,
}));

const mockIsMacOS = isMacOS as MockedFunction<typeof isMacOS>;
const mockUseSvgScaleContext = useSvgScaleContext as MockedFunction<
  typeof useSvgScaleContext
>;
const mockCalculateSvgCoords = calculateSvgCoords as MockedFunction<
  typeof calculateSvgCoords
>;

// Helper function to create mock wheel events
const createMockWheelEvent = (
  options: Partial<WheelEvent<SVGSVGElement>> = {},
): WheelEvent<SVGSVGElement> => {
  const preventDefault = vi.fn();
  const stopPropagation = vi.fn();

  return {
    deltaX: 0,
    deltaY: 0,
    clientX: 0,
    clientY: 0,
    ctrlKey: false,
    metaKey: false,
    preventDefault,
    stopPropagation,
    ...options,
  } as WheelEvent<SVGSVGElement>;
};

describe('useWheelZoom', () => {
  let mockSvgElement: HTMLElement;
  let mockUpdateScale: ReturnType<typeof vi.fn>;
  let mockUpdateTranslation: ReturnType<typeof vi.fn>;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let svgRef: RefObject<SVGSVGElement>;

  beforeEach(() => {
    vi.useFakeTimers();

    // Create mock SVG element
    mockSvgElement = document.createElement('div') as unknown as HTMLElement;

    // Mock context functions
    mockUpdateScale = vi.fn();
    mockUpdateTranslation = vi.fn();

    // Setup default mocks
    mockUseSvgScaleContext.mockReturnValue({
      scale: 1,
      setScale: vi.fn(),
      translation: { x: 0, y: 0 },
      updateScale: mockUpdateScale,
      updateTranslation: mockUpdateTranslation,
      containerDimensions: { width: 800, height: 600 },
      setContainerDimensions: vi.fn(),
      containerDimensionsRef: {
        current: { width: 800, height: 600 },
      },
      transformPointSvgToContainer: vi.fn(),
      viewportCanvasCenter: { x: 0, y: 0 },
      moveToPoint: vi.fn(),
    });

    mockCalculateSvgCoords.mockReturnValue({ x: 100, y: 200 });
    mockIsMacOS.mockReturnValue(false); // Default to Linux/Windows

    // Create wrapper that provides a ref to the hook
    Wrapper = ({ children }: PropsWithChildren<{}>) => {
      const ref = useRef<SVGSVGElement>(
        mockSvgElement as unknown as SVGSVGElement,
      );
      svgRef = ref;
      return <div>{children}</div>;
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Linux/Windows behavior', () => {
    beforeEach(() => {
      mockIsMacOS.mockReturnValue(false);
    });

    it('should zoom in with mouse wheel scroll up (Chrome delta)', () => {
      const { result } = renderHook(() => useWheelZoom(svgRef), {
        wrapper: Wrapper,
      });

      const wheelEvent = createMockWheelEvent({
        deltaY: -120, // Chrome wheel delta
        deltaX: 0,
        clientX: 150,
        clientY: 250,
      });

      act(() => {
        result.current.handleWheelZoom(wheelEvent);
      });

      expect(mockCalculateSvgCoords).toHaveBeenCalledWith(
        { x: 150, y: 250 },
        mockSvgElement,
      );
      expect(mockUpdateScale).toHaveBeenCalledWith(
        0.2, // zoomStep * scale * 2 (Linux multiplier)
        { x: 100, y: 200 },
      );
      expect(mockUpdateTranslation).not.toHaveBeenCalled();
    });

    it('should zoom out with mouse wheel scroll down (Firefox delta)', () => {
      const { result } = renderHook(() => useWheelZoom(svgRef), {
        wrapper: Wrapper,
      });

      const wheelEvent = createMockWheelEvent({
        deltaY: 138, // Firefox wheel delta
        deltaX: 0,
        clientX: 150,
        clientY: 250,
      });

      act(() => {
        result.current.handleWheelZoom(wheelEvent);
      });

      expect(mockUpdateScale).toHaveBeenCalledWith(
        -0.2, // negative for zoom out
        { x: 100, y: 200 },
      );
    });

    it('should pan with touchpad gestures (small deltas)', () => {
      const { result } = renderHook(() => useWheelZoom(svgRef), {
        wrapper: Wrapper,
      });

      const wheelEvent = createMockWheelEvent({
        deltaX: 30,
        deltaY: 2, // Small delta, not divisible by 120 or 138
      });

      act(() => {
        result.current.handleWheelZoom(wheelEvent);
      });

      expect(mockUpdateTranslation).toHaveBeenCalledWith(-30, -2);
      expect(mockUpdateScale).not.toHaveBeenCalled();
    });
  });

  describe('macOS behavior', () => {
    beforeEach(() => {
      mockIsMacOS.mockReturnValue(true);
    });

    it('should zoom with Ctrl+trackpad', () => {
      const { result } = renderHook(() => useWheelZoom(svgRef), {
        wrapper: Wrapper,
      });

      const wheelEvent = createMockWheelEvent({
        deltaY: -10,
        ctrlKey: true,
        clientX: 150,
        clientY: 250,
      });

      act(() => {
        result.current.handleWheelZoom(wheelEvent);
      });

      expect(mockUpdateScale).toHaveBeenCalledWith(
        0.1, // No 2x multiplier on macOS
        { x: 100, y: 200 },
      );
    });

    it('should zoom with Meta+trackpad', () => {
      const { result } = renderHook(() => useWheelZoom(svgRef), {
        wrapper: Wrapper,
      });

      const wheelEvent = createMockWheelEvent({
        deltaY: -10,
        metaKey: true,
        clientX: 150,
        clientY: 250,
      });

      act(() => {
        result.current.handleWheelZoom(wheelEvent);
      });

      expect(mockUpdateScale).toHaveBeenCalledWith(0.1, { x: 100, y: 200 });
    });

    it('should pan by default on trackpad without modifier keys', () => {
      const { result } = renderHook(() => useWheelZoom(svgRef), {
        wrapper: Wrapper,
      });

      const wheelEvent = createMockWheelEvent({
        deltaX: 15,
        deltaY: 3, // Small delta (touchpad)
      });

      act(() => {
        result.current.handleWheelZoom(wheelEvent);
      });

      expect(mockUpdateTranslation).toHaveBeenCalledWith(-15, -3);
      expect(mockUpdateScale).not.toHaveBeenCalled();
    });
  });

  describe('wheel zoom progress state', () => {
    it('should set wheelZoomInProgress to true during zoom', () => {
      const { result } = renderHook(() => useWheelZoom(svgRef), {
        wrapper: Wrapper,
      });

      expect(result.current.wheelZoomInProgress).toBe(false);

      const wheelEvent = createMockWheelEvent({
        deltaY: -120,
        clientX: 150,
        clientY: 250,
      });

      act(() => {
        result.current.handleWheelZoom(wheelEvent);
      });

      expect(result.current.wheelZoomInProgress).toBe(true);
    });

    it('should reset wheelZoomInProgress after timeout', async () => {
      const { result } = renderHook(() => useWheelZoom(svgRef), {
        wrapper: Wrapper,
      });

      const wheelEvent = createMockWheelEvent({
        deltaY: -120,
        clientX: 150,
        clientY: 250,
      });

      act(() => {
        result.current.handleWheelZoom(wheelEvent);
      });

      expect(result.current.wheelZoomInProgress).toBe(true);

      act(() => {
        vi.advanceTimersByTime(300); // WHEEL_ZOOM_TIMEOUT
      });

      expect(result.current.wheelZoomInProgress).toBe(false);
    });
  });
});
