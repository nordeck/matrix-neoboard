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

export const useWheelZoom = (
  svgRef: RefObject<SVGSVGElement>,
): UseWheelZoomResult => {
  const { scale, updateScale, updateTranslation } = useSvgScaleContext();
  const [wheelZoomInProgress, setWheelZoomInProgress] =
    useState<boolean>(false);

  const wheelZoomTimeoutRef = useRef<Timeout>();

  const handleWheelZoom = useCallback(
    (event: WheelEvent) => {
      if (!svgRef.current) {
        return;
      }

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

      console.error(event.deltaY, event.deltaX);

      // Heuristic for pinch-to-zoom vs pan
      const isPinchZoom =
        event.ctrlKey ||
        event.metaKey ||
        // TODO: double check this
        (isMacOS() &&
          Math.abs(event.deltaY) > 20 &&
          Math.abs(event.deltaX) < 2 &&
          !event.ctrlKey) ||
        (event.deltaX < 1 &&
          // 120 is the delta reported by Chrome
          // 138 is the delta reported by Firefox
          [120, 138].some((divisor) => Math.abs(event.deltaY) % divisor === 0));

      if (isPinchZoom) {
        console.error('PINCH!');
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
        console.error('PAN!');
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
    };
  }, []);

  return {
    handleWheelZoom,
    wheelZoomInProgress,
  };
};
