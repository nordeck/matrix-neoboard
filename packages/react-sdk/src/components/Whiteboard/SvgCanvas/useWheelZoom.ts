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
import { zoomStep } from '../constants';
import { useSvgScaleContext } from '../SvgScaleContext';
import { calculateSvgCoords } from './utils';

type UseWheelZoomResult = {
  handleWheelZoom: WheelEventHandler<SVGSVGElement>;
  wheelZoomInProgress: boolean;
};

type Timeout = ReturnType<typeof setTimeout>;

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

  const handleWheelZoom = useCallback(
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

  return {
    handleWheelZoom,
    wheelZoomInProgress,
  };
};
