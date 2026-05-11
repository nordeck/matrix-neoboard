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
  Mocked,
  vi,
} from 'vitest';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../../lib/testUtils';
import { WhiteboardManager } from '../../../state';
import { isMacOS as isMacOSMocked } from '../../common/platform';
import { SvgScaleContextType, useSvgScaleContext } from '../SvgScaleContext';
import { useWheelZoom } from './useWheelZoom';
import { calculateSvgCoords as calculateSvgCoordsMock } from './utils';

vi.mock('../../common/platform', async (importOriginal) => ({
  ...(await importOriginal()),
  isMacOS: vi.fn().mockReturnValue(false),
}));
vi.mock('./utils', async (importOriginal) => ({
  ...(await importOriginal()),
  calculateSvgCoords: vi.fn().mockReturnValue({ x: 100, y: 200 }),
}));

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

const isMacOS = vi.mocked(isMacOSMocked);
const calculateSvgCoords = vi.mocked(calculateSvgCoordsMock);

// Helper function to create mock wheel events
const createMockWheelEvent = (
  options: Partial<WheelEvent<SVGSVGElement>> = {},
): WheelEvent<SVGSVGElement> => {
  return {
    deltaX: 0,
    deltaY: 0,
    clientX: 0,
    clientY: 0,
    ctrlKey: false,
    metaKey: false,
    preventDefault: vi.fn(),
    stopPropagation: vi.fn(),
    ...options,
  } as WheelEvent<SVGSVGElement>;
};

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('useWheelZoom', () => {
  let mockSvgElement: HTMLElement;

  let svgScaleContext: SvgScaleContextType;
  const ContextExtractor = () => {
    svgScaleContext = useSvgScaleContext();
    return null;
  };

  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let setPresentationMode: (
    enable: boolean,
    enableEdit?: boolean,
    presentationType?: 'presentation' | 'presenting',
  ) => void;

  let svgRef: RefObject<SVGSVGElement>;

  beforeEach(() => {
    vi.useFakeTimers();

    // Create mock SVG element
    mockSvgElement = document.createElement('div') as unknown as HTMLElement;

    ({ whiteboardManager, setPresentationMode } = mockWhiteboardManager());

    // Create wrapper that provides a ref to the hook
    Wrapper = ({ children }: PropsWithChildren<{}>) => {
      svgRef = useRef<SVGSVGElement>(
        mockSvgElement as unknown as SVGSVGElement,
      );
      return (
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <ContextExtractor />
          {children}
        </WhiteboardTestingContextProvider>
      );
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Linux/Windows behavior', () => {
    it('should zoom in with mouse wheel scroll up (Chrome delta)', async () => {
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

      expect(calculateSvgCoords).toHaveBeenCalledWith(
        { x: 150, y: 250 },
        mockSvgElement,
      );

      expect(svgScaleContext.scale).toEqual(1.2); // add zoomStep * scale * 2 (Linux multiplier)
      expect(svgScaleContext.translation).not.toEqual({ x: 0, y: 0 });
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

      expect(svgScaleContext.scale).toEqual(0.8);
      expect(svgScaleContext.translation).not.toEqual({ x: 0, y: 0 });
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

      expect(svgScaleContext.scale).toEqual(1);
      expect(svgScaleContext.translation).toEqual({ x: -30, y: -2 });
    });
  });

  describe('macOS behavior', () => {
    beforeEach(() => {
      isMacOS.mockReturnValue(true);
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

      expect(svgScaleContext.scale).toEqual(1.1); // No 2x multiplier on macOS
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

      expect(svgScaleContext.scale).toEqual(1.1);
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

      expect(svgScaleContext.scale).toEqual(1);
      expect(svgScaleContext.translation).toEqual({ x: -15, y: -3 });
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

    it('should not zoom with mouse wheel scroll if the presentation mode is active', () => {
      setPresentationMode(true);

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

      expect(calculateSvgCoords).not.toHaveBeenCalled();

      expect(svgScaleContext.scale).toEqual(1);
      expect(svgScaleContext.translation).toEqual({ x: 0, y: 0 });
    });

    it('should not zoom with mouse wheel scroll if the presentation mode is active and presenting', () => {
      setPresentationMode(true, false, 'presenting');

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

      expect(calculateSvgCoords).not.toHaveBeenCalled();

      expect(svgScaleContext.scale).toEqual(1);
      expect(svgScaleContext.translation).toEqual({ x: 0, y: 0 });
    });

    it('should not pan with touchpad gestures if the presentation mode is active', () => {
      setPresentationMode(true);

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

      expect(svgScaleContext.scale).toEqual(1);
      expect(svgScaleContext.translation).toEqual({ x: 0, y: 0 });
    });

    it('should not pan with touchpad gestures if the presentation mode is active and presenting', () => {
      setPresentationMode(true, false, 'presenting');

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

      expect(svgScaleContext.scale).toEqual(1);
      expect(svgScaleContext.translation).toEqual({ x: 0, y: 0 });
    });
  });
});
