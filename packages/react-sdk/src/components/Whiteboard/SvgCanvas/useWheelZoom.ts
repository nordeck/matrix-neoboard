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

type Timeout = ReturnType<typeof setTimeout>;

/**
 * This method handles touchpad and scroll wheel mouse events only.
 */
export const useWheelZoom = (
  svgRef: RefObject<SVGSVGElement>,
): UseWheelZoomResult => {
  const { scale, updateScale, updateTranslation } = useSvgScaleContext();
  const [wheelZoomInProgress, setWheelZoomInProgress] =
    useState<boolean>(false);

  const wheelZoomTimeoutRef = useRef<Timeout>();

  const lastTimeRef = useRef<number>(0);
  const interactionModeRef = useRef<'none' | 'zooming' | 'panning'>('none');
  const interactionTimeoutRef = useRef<Timeout | null>(null);

  // Reset interaction mode after a period of inactivity
  const resetInteractionMode = useCallback(() => {
    interactionModeRef.current = 'none';
  }, []);

  const handleMacOSWheelZoom = useCallback(
    (event: WheelEvent) => {
      if (!svgRef.current) {
        return;
      }

      setWheelZoomInProgress(true);
      if (wheelZoomTimeoutRef.current) {
        clearTimeout(wheelZoomTimeoutRef.current);
        wheelZoomTimeoutRef.current = undefined;
      }
      wheelZoomTimeoutRef.current = setTimeout(() => {
        setWheelZoomInProgress(false);
      }, 300);

      const now = Date.now();
      const timeDiff = now - lastTimeRef.current;

      // Clear any existing timeout to reset interaction mode
      if (interactionTimeoutRef.current !== null) {
        clearTimeout(interactionTimeoutRef.current);
      }

      // we need a fast timeout for touchpads, as interactions change faster between zooming and panning
      const isLikelyTouchpad = Math.abs(event.deltaY) < 4;
      interactionTimeoutRef.current = setTimeout(
        resetInteractionMode,
        isLikelyTouchpad ? 50 : 200,
      );

      if (interactionModeRef.current === 'none') {
        if (event.ctrlKey || event.metaKey) {
          interactionModeRef.current = 'zooming';
        } else {
          // dark magic below
          const isLikelyScrollWheel =
            !isLikelyTouchpad && timeDiff > 200 && Math.abs(event.deltaX) === 0;
          const isPinchZoom = timeDiff < 50 && Math.abs(event.deltaX) === 0;

          interactionModeRef.current =
            isLikelyScrollWheel || isPinchZoom ? 'zooming' : 'panning';
        }
      }

      if (interactionModeRef.current === 'zooming') {
        if (event.deltaY === 0) {
          return;
        }

        const zoomOriginOnCanvas = calculateSvgCoords(
          {
            x: event.clientX,
            y: event.clientY,
          },
          svgRef.current,
        );

        const wheelZoomStep = zoomStep * scale;

        updateScale(
          event.deltaY < 0 ? wheelZoomStep : -wheelZoomStep,
          zoomOriginOnCanvas,
        );
      } else {
        updateTranslation(-event.deltaX, -event.deltaY);
      }

      lastTimeRef.current = now;

      event.preventDefault();
      event.stopPropagation();
    },
    [svgRef, scale, updateScale, updateTranslation, resetInteractionMode],
  );

  const handleLinuxWheelZoom = useCallback(
    (event: WheelEvent) => {
      if (!svgRef.current) {
        return;
      }

      // This is moved up because otherwise zooming with the touchpad and moving sideways
      // may trigger the full browser window being zoomed instead
      event.preventDefault();
      event.stopPropagation();

      setWheelZoomInProgress(true);
      if (wheelZoomTimeoutRef.current) {
        clearTimeout(wheelZoomTimeoutRef.current);
        wheelZoomTimeoutRef.current = undefined;
      }
      wheelZoomTimeoutRef.current = setTimeout(() => {
        setWheelZoomInProgress(false);
      }, 300);

      // Heuristic for zoom vs pan
      const isZoom =
        event.ctrlKey ||
        event.metaKey ||
        (event.deltaY !== 0 &&
          event.deltaX < 1 &&
          // This is for mouse wheel zooming - on Linux, the deltas are large values
          // 120 is the delta reported by Chrome
          // 138 is the delta reported by Firefox
          //
          // This approach doesn't work for macOS browsers, as they report smaller values
          // which touchpad panning events also emit
          [120, 138].some((divisor) => Math.abs(event.deltaY) % divisor === 0));

      if (isZoom) {
        if (event.deltaY === 0) {
          return;
        }
        const zoomOriginOnCanvas = calculateSvgCoords(
          {
            x: event.clientX,
            y: event.clientY,
          },
          svgRef.current,
        );
        // Increase stepping for Linux browsers
        const wheelZoomStep = zoomStep * scale * 2;
        updateScale(
          event.deltaY < 0 ? wheelZoomStep : -wheelZoomStep,
          zoomOriginOnCanvas,
        );
      } else {
        updateTranslation(-event.deltaX, -event.deltaY);
      }
    },
    [svgRef, scale, updateScale, updateTranslation],
  );

  // Clean up timeout on unmount
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

  const systemHandler = isMacOS() ? handleMacOSWheelZoom : handleLinuxWheelZoom;

  return {
    handleWheelZoom: systemHandler,
    wheelZoomInProgress,
  };
};
