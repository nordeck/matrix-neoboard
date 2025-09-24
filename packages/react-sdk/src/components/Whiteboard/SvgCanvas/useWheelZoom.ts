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

import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  WheelEvent,
  WheelEventHandler,
} from 'react';
import { isMacOS } from '../../common/platform';
import { zoomStep } from '../constants';
import { useSvgScaleContext } from '../SvgScaleContext';
import { calculateSvgCoords } from './utils';

type UseWheelZoomResult = {
  handleWheelZoom: WheelEventHandler<SVGSVGElement>;
  wheelZoomInProgress: boolean;
};

type InteractionMode = 'none' | 'zooming' | 'panning';
type Timeout = ReturnType<typeof setTimeout>;

const WHEEL_ZOOM_TIMEOUT = 300;
const TOUCHPAD_THRESHOLD = 4;
const TOUCHPAD_INTERACTION_TIMEOUT = 50;
const SCROLL_WHEEL_INTERACTION_TIMEOUT = 200;
const PINCH_ZOOM_TIME_THRESHOLD = 50;
const SCROLL_WHEEL_TIME_THRESHOLD = 200;

/**
 * This method handles touchpad and scroll wheel mouse events only.
 */
export const useWheelZoom = (
  svgRef: RefObject<SVGSVGElement>,
): UseWheelZoomResult => {
  const { scale, updateScale, updateTranslation } = useSvgScaleContext();
  const [wheelZoomInProgress, setWheelZoomInProgress] =
    useState<boolean>(false);

  const macOS = useMemo(() => isMacOS(), []);

  const wheelZoomTimeoutRef = useRef<Timeout>();
  const lastTimeRef = useRef<number>(0);
  const interactionModeRef = useRef<InteractionMode>('none');
  const interactionTimeoutRef = useRef<Timeout | null>(null);

  // Reset interaction mode after a period of inactivity
  const resetInteractionMode = useCallback(() => {
    interactionModeRef.current = 'none';
  }, []);

  // Shared zoom progress management
  const setZoomProgressWithTimeout = useCallback(() => {
    setWheelZoomInProgress(true);

    if (wheelZoomTimeoutRef.current) {
      clearTimeout(wheelZoomTimeoutRef.current);
    }

    wheelZoomTimeoutRef.current = setTimeout(() => {
      setWheelZoomInProgress(false);
    }, WHEEL_ZOOM_TIMEOUT);
  }, []);

  // Shared zoom logic
  const performZoom = useCallback(
    (event: WheelEvent) => {
      if (event.deltaY === 0 || !svgRef.current) return;

      const zoomOriginOnCanvas = calculateSvgCoords(
        { x: event.clientX, y: event.clientY },
        svgRef.current,
      );

      const zoomMultiplier = macOS ? 1 : 2;
      const wheelZoomStep = zoomStep * scale * zoomMultiplier;
      updateScale(
        event.deltaY < 0 ? wheelZoomStep : -wheelZoomStep,
        zoomOriginOnCanvas,
      );
    },
    [scale, updateScale, svgRef, macOS],
  );

  // Shared panning logic
  const performPanning = useCallback(
    (event: WheelEvent) => {
      updateTranslation(-event.deltaX, -event.deltaY);
    },
    [updateTranslation],
  );

  // macOS-specific interaction mode detection
  const determineMacOSInteractionMode = useCallback(
    (event: WheelEvent) => {
      const now = Date.now();
      const timeDiff = now - lastTimeRef.current;

      // Clear any existing timeout to reset interaction mode
      if (interactionTimeoutRef.current !== null) {
        clearTimeout(interactionTimeoutRef.current);
      }

      // We need a fast timeout for touchpads, as interactions change faster between zooming and panning
      const isLikelyTouchpad = Math.abs(event.deltaY) < TOUCHPAD_THRESHOLD;
      interactionTimeoutRef.current = setTimeout(
        resetInteractionMode,
        isLikelyTouchpad
          ? TOUCHPAD_INTERACTION_TIMEOUT
          : SCROLL_WHEEL_INTERACTION_TIMEOUT,
      );

      if (interactionModeRef.current === 'none') {
        if (event.ctrlKey || event.metaKey) {
          interactionModeRef.current = 'zooming';
        } else {
          const isLikelyScrollWheel =
            !isLikelyTouchpad &&
            timeDiff > SCROLL_WHEEL_TIME_THRESHOLD &&
            Math.abs(event.deltaX) === 0;
          const isPinchZoom =
            timeDiff < PINCH_ZOOM_TIME_THRESHOLD &&
            Math.abs(event.deltaX) === 0;

          interactionModeRef.current =
            isLikelyScrollWheel || isPinchZoom ? 'zooming' : 'panning';
        }
      }

      lastTimeRef.current = now;
      return interactionModeRef.current === 'zooming';
    },
    [resetInteractionMode],
  );

  // Linux-specific zoom detection
  const isLinuxZoom = useCallback((event: WheelEvent) => {
    return (
      event.ctrlKey ||
      event.metaKey ||
      (event.deltaY !== 0 &&
        event.deltaX < 1 &&
        // on Linux, the wheel zoom deltas are large values
        // 120 is the delta reported by Chrome
        // 138 is the delta reported by Firefox
        //
        // This approach doesn't work for macOS browsers, as they report smaller values
        // which touchpad panning events also emit
        [120, 138].some((divisor) => Math.abs(event.deltaY) % divisor === 0))
    );
  }, []);

  // Unified wheel event handler
  const handleWheelZoom = useCallback(
    (event: WheelEvent) => {
      if (!svgRef.current) return;

      // Always prevent default to avoid browser zoom/scroll
      event.preventDefault();
      event.stopPropagation();

      // Shared zoom progress management
      setZoomProgressWithTimeout();

      // Determine if this should be zoom or pan based on OS
      const shouldZoom = macOS
        ? determineMacOSInteractionMode(event)
        : isLinuxZoom(event);

      // Perform the action
      if (shouldZoom) {
        performZoom(event);
      } else {
        performPanning(event);
      }
    },
    [
      svgRef,
      macOS,
      setZoomProgressWithTimeout,
      determineMacOSInteractionMode,
      isLinuxZoom,
      performZoom,
      performPanning,
    ],
  );

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (wheelZoomTimeoutRef.current) {
        clearTimeout(wheelZoomTimeoutRef.current);
      }
      if (interactionTimeoutRef.current !== null) {
        clearTimeout(interactionTimeoutRef.current);
      }
    };
  }, []);

  return {
    handleWheelZoom,
    wheelZoomInProgress,
  };
};
