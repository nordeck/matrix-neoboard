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

const TAP_TIMEOUT_MS = 500;
const DRAG_TIMEOUT_MS = 200;
const MIN_SCALE_DISTANCE_PX = 20;

const SVGTouchCapture: React.FC<PropsWithChildren> = ({ children }) => {
  const { setIsTouchScaling } = useLayoutState();

  const { calculateSvgCoords } = useSvgCanvasContext();

  const { scale, updateScale } = useSvgScaleContext();

  const touchContextRef = useRef<{
    a?: Point;
    b?: Point;
    clienta?: Point;
    clientb?: Point;
    center: Point;
    scale: number;
    dt: Date;
  }>({
    a: void 0,
    b: void 0,
    clienta: void 0,
    clientb: void 0,
    center: { x: 0, y: 0 },
    scale: 1,
    dt: new Date(),
  });

  const handleTouchStart = useCallback(
    (e: TouchEvent<SVGGElement>) => {
      if (e.touches.length === 2) {
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
          a,
          b,
          clienta,
          clientb,
          center: getMidpoint(a, b),
          scale,
          dt: new Date(),
        };

        setIsTouchScaling(true);

        return;
      }
    },
    [calculateSvgCoords, scale, setIsTouchScaling],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent<SVGGElement>) => {
      if (Date.now() - touchContextRef.current.dt.getTime() < TAP_TIMEOUT_MS) {
        e.stopPropagation();
      }

      setIsTouchScaling(false);
    },
    [setIsTouchScaling],
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent<SVGGElement>) => {
      if (e.touches.length === 2) {
        e.stopPropagation();
        setIsTouchScaling(true);
        if (!touchContextRef.current.a) return;
        if (!touchContextRef.current.b) return;
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

        if (
          Math.abs(
            distanceBetweenTwoPoints(clienta, clientb) -
              distanceBetweenTwoPoints(
                touchContextRef.current.clienta,
                touchContextRef.current.clientb,
              ),
          ) < MIN_SCALE_DISTANCE_PX
        )
          return;

        updateScale(
          touchContextRef.current.scale * ratio,
          'set',
          touchContextRef.current.center,
        );

        touchContextRef.current = {
          ...touchContextRef.current,
          dt: new Date(),
        };

        return;
      }

      if (Date.now() - touchContextRef.current.dt.getTime() < DRAG_TIMEOUT_MS) {
        e.stopPropagation();
      }
      setIsTouchScaling(false);
    },
    [setIsTouchScaling, updateScale],
  );

  return (
    <g
      onTouchMoveCapture={handleTouchMove}
      onTouchStartCapture={handleTouchStart}
      onTouchEndCapture={handleTouchEnd}
    >
      {children}
    </g>
  );
};

export default SVGTouchCapture;
