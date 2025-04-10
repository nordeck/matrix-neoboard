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

import { RefObject, useCallback, WheelEvent, WheelEventHandler } from 'react';
import { infiniteCanvasMode, zoomStep } from '../constants';
import { useSvgScaleContext } from '../SvgScaleContext';
import { calculateSvgCoords } from './utils';

type UseWheelZoomResult = {
  handleWheelZoom: WheelEventHandler<SVGSVGElement>;
};

export const useWheelZoom = (
  svgRef: RefObject<SVGSVGElement>,
): UseWheelZoomResult => {
  const { updateScale, updateTranslation } = useSvgScaleContext();

  const handleWheelZoom = useCallback(
    (event: WheelEvent) => {
      if (!infiniteCanvasMode) {
        return;
      }

      if (!svgRef.current) {
        return;
      }

      if (event.ctrlKey) {
        if (event.deltaY === 0) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();

        // calculateSvgCoords from SvgCanvasContext cannot be used here,
        // because this hook is most likely being used outside of a context.
        const zoomOriginOnCanvas = calculateSvgCoords(
          {
            x: event.clientX,
            y: event.clientY,
          },
          svgRef.current,
        );

        // smoother zooming when using wheel
        const wheelZoomStep = zoomStep / 2;
        updateScale(
          event.deltaY < 0 ? wheelZoomStep : -wheelZoomStep,
          zoomOriginOnCanvas,
        );
      } else {
        // Wheel's deltaX is often a multiple of 20.
        // Wheel's deltaY is often a multiple of 120.
        updateTranslation(-event.deltaX, -event.deltaY);
      }
    },
    [svgRef, updateScale, updateTranslation],
  );

  return {
    handleWheelZoom,
  };
};
