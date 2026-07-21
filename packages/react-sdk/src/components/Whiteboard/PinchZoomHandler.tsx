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

import { PointerEvent, PropsWithChildren, useCallback, useRef } from 'react';
import { Point, usePresentationMode } from '../../state';
import { useLayoutState } from '../Layout';
import { useSvgCanvasContext } from './SvgCanvas';
import { useSvgScaleContext } from './SvgScaleContext';

export function PinchZoomHandler({ children }: PropsWithChildren<{}>) {
  const { setIsPinchZooming } = useLayoutState();
  const { calculateSvgCoords } = useSvgCanvasContext();
  const { scale, updateScale } = useSvgScaleContext();
  const { state: presentationState } = usePresentationMode();

  const activePointersRef = useRef<Map<number, Point>>(new Map());
  const touchContextRef = useRef<{
    pointA: Point;
    pointB: Point;
    center: Point;
    scale: number;
  }>();

  const isZoomEnabled = presentationState.type === 'idle';

  const handlePointerDown = useCallback(
    (e: PointerEvent<SVGGElement>) => {
      if (e.pointerType !== 'touch') {
        return;
      }

      activePointersRef.current.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
      });

      if (activePointersRef.current.size === 2 && isZoomEnabled) {
        const [pointA, pointB] = [...activePointersRef.current.values()];

        const a = calculateSvgCoords(pointA);
        const b = calculateSvgCoords(pointB);

        touchContextRef.current = {
          pointA,
          pointB,
          center: getMidpoint(a, b),
          scale,
        };

        setIsPinchZooming(true);
      }
    },
    [calculateSvgCoords, scale, isZoomEnabled, setIsPinchZooming],
  );

  const handlePointerMove = useCallback(
    (e: PointerEvent<SVGGElement>) => {
      if (e.pointerType !== 'touch') {
        return;
      }

      const pointers = activePointersRef.current;

      if (!pointers.has(e.pointerId)) {
        return;
      }

      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

      // just don't deal with more than 2 fingers
      if (pointers.size > 2) {
        e.stopPropagation();
        return;
      }

      if (pointers.size === 2 && isZoomEnabled && touchContextRef.current) {
        e.stopPropagation();

        const oldDist = distanceBetweenTwoPoints(
          touchContextRef.current.pointA,
          touchContextRef.current.pointB,
        );

        const [pointA, pointB] = [...pointers.values()];

        const newDist = distanceBetweenTwoPoints(pointA, pointB);

        const ratio = newDist / oldDist;

        if (Math.abs(ratio - 1) < 0.05) {
          return;
        }

        updateScale(
          touchContextRef.current.scale * ratio,
          'set',
          touchContextRef.current.center,
        );
      }
    },
    [updateScale, isZoomEnabled],
  );

  const handlePointerUp = useCallback(
    (e: PointerEvent<SVGGElement>) => {
      if (e.pointerType !== 'touch') {
        return;
      }

      activePointersRef.current.delete(e.pointerId);

      if (activePointersRef.current.size < 2) {
        touchContextRef.current = undefined;
        setIsPinchZooming(false);
      }
    },
    [setIsPinchZooming],
  );

  return (
    <g
      data-testid="pinch-zoom-handler"
      onPointerDownCapture={handlePointerDown}
      onPointerMoveCapture={handlePointerMove}
      onPointerUpCapture={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {children}
    </g>
  );
}

function distanceBetweenTwoPoints(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function getMidpoint(a: Point, b: Point) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}
