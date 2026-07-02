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

import { PropsWithChildren, TouchEvent, useCallback, useRef } from 'react';
import { usePresentationMode } from '../../state';
import { Point } from '../../state/crdt/documents/point';
import { useLayoutState } from '../Layout';
import { useSvgCanvasContext } from './SvgCanvas';
import { useSvgScaleContext } from './SvgScaleContext';

function distanceBetweenTwoPoints(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getMidpoint(a: Point, b: Point) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}

const SCALE_TIMEOUT_MS = 100;
const MIN_SCALE_DISTANCE_PX = 20;

const SVGTouchCapture: React.FC<PropsWithChildren> = ({ children }) => {
  const { setIsTouchScaling, isTouchScaling } = useLayoutState();

  const { calculateSvgCoords } = useSvgCanvasContext();

  const { scale, updateScale } = useSvgScaleContext();

  const { state: presentationState } = usePresentationMode();
  const zoomEnabled = presentationState.type === 'idle';

  const touchContextRef = useRef<{
    clienta?: Point;
    clientb?: Point;
    center: Point;
    scale: number;
    dt: Date;
  }>({
    clienta: void 0,
    clientb: void 0,
    center: { x: 0, y: 0 },
    scale: 1,
    dt: new Date(),
  });

  const handleTouchStart = useCallback(
    (e: TouchEvent<SVGGElement>) => {
      if (e.touches.length === 2 && zoomEnabled) {
        e.stopPropagation();

        const a = calculateSvgCoords({
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        });
        const b = calculateSvgCoords({
          x: e.touches[1].clientX,
          y: e.touches[1].clientY,
        });

        const clienta = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const clientb = { x: e.touches[1].clientX, y: e.touches[1].clientY };

        // scale start
        touchContextRef.current = {
          ...touchContextRef.current,
          clienta,
          clientb,
          center: getMidpoint(a, b),
          scale,
          dt: new Date(),
        };

        setIsTouchScaling(true);

        return;
      }

      if (isTouchScaling) {
        e.stopPropagation();
      }
    },
    [calculateSvgCoords, isTouchScaling, scale, setIsTouchScaling, zoomEnabled],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent<SVGGElement>) => {
      // Ignore fast taps that may happen after you stop zooming.
      // Maybe it's not needed, but it sometimes happens that
      // at the end of the zoom, a tap is registered that selects or unselects an element
      // so the propagation is stopped for a short time
      if (
        Date.now() - touchContextRef.current.dt.getTime() <
        SCALE_TIMEOUT_MS
      ) {
        e.stopPropagation();
      }
      setIsTouchScaling(false);
    },
    [setIsTouchScaling],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent<SVGGElement>) => {
      // just don't deal with more than 2 fingers
      if (e.touches.length > 2) {
        e.stopPropagation();
        e.preventDefault();
      }

      // zooming
      if (e.touches.length === 2 && zoomEnabled) {
        e.stopPropagation();
        touchContextRef.current.dt = new Date();

        if (!touchContextRef.current.clienta) return;
        if (!touchContextRef.current.clientb) return;

        const oldDist = distanceBetweenTwoPoints(
          touchContextRef.current.clienta,
          touchContextRef.current.clientb,
        );

        const clienta = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        const clientb = { x: e.touches[1].clientX, y: e.touches[1].clientY };

        const newDist = distanceBetweenTwoPoints(clienta, clientb);

        const ratio = newDist / oldDist;

        setIsTouchScaling(true);

        // have to move for some distance to prevent jitter
        if (Math.abs(newDist - oldDist) < MIN_SCALE_DISTANCE_PX) {
          return;
        }

        updateScale(
          touchContextRef.current.scale * ratio,
          'set',
          touchContextRef.current.center,
        );

        return;
      }

      // not zooming if we got here, but ignore touches for some time, should
      // prevent things from being unexpectedly selected or moved
      if (
        Date.now() - touchContextRef.current.dt.getTime() <
        SCALE_TIMEOUT_MS
      ) {
        e.stopPropagation();
      }
    },
    [setIsTouchScaling, updateScale, zoomEnabled],
  );

  const handleTouchCancel = useCallback(() => {
    setIsTouchScaling(false);
  }, [setIsTouchScaling]);

  return (
    <g
      onTouchMoveCapture={handleTouchMove}
      onTouchStartCapture={handleTouchStart}
      onTouchEndCapture={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {children}
    </g>
  );
};

export default SVGTouchCapture;
