/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { styled } from '@mui/material';
import { Dispatch, PointerEvent, PropsWithChildren, useCallback } from 'react';
import { Point } from '../../../state';
import { useLayoutState } from '../../Layout';
import { useSvgCanvasContext } from '../SvgCanvas';
import editRoundedUrl from './editRounded.svg';

const NoInteraction = styled('g')({
  pointerEvents: 'none',
});

export type DraftMouseHandlerProps = PropsWithChildren<{
  onClick?: Dispatch<Point>;
  onPointerDown?: Dispatch<Point>;
  onPointerLeave?: Dispatch<Point>;
  onPointerMove?: Dispatch<Point>;
  onPointerUp?: Dispatch<Point>;
}>;

export function DraftMouseHandler({
  onClick,
  onPointerUp,
  onPointerLeave,
  onPointerDown,
  onPointerMove,
  children,
}: DraftMouseHandlerProps) {
  const { calculateSvgCoords } = useSvgCanvasContext();
  const { activeTool } = useLayoutState();
  const shapeCursor =
    activeTool === 'polyline'
      ? `url("${editRoundedUrl}") 3 21, crosshair`
      : 'crosshair';

  const handleClick = useCallback(
    (ev: PointerEvent<SVGRectElement>) => {
      if (onClick) {
        const point = calculateSvgCoords({ x: ev.clientX, y: ev.clientY });
        onClick(point);
      }
    },
    [calculateSvgCoords, onClick],
  );

  const handlePointerUp = useCallback(
    (ev: PointerEvent<SVGRectElement>) => {
      if (onPointerUp) {
        const point = calculateSvgCoords({ x: ev.clientX, y: ev.clientY });
        onPointerUp(point);
      }
    },
    [onPointerUp, calculateSvgCoords],
  );

  const handlePointerDown = useCallback(
    (ev: PointerEvent<SVGRectElement>) => {
      if (onPointerDown) {
        const point = calculateSvgCoords({ x: ev.clientX, y: ev.clientY });
        onPointerDown(point);
      }
    },
    [onPointerDown, calculateSvgCoords],
  );

  const handlePointerMove = useCallback(
    (ev: PointerEvent<SVGRectElement>) => {
      if (onPointerMove) {
        const point = calculateSvgCoords({ x: ev.clientX, y: ev.clientY });
        onPointerMove(point);
      }
    },
    [onPointerMove, calculateSvgCoords],
  );

  const handlePointerLeave = useCallback(
    (ev: PointerEvent<SVGRectElement>) => {
      if (onPointerLeave) {
        const point = calculateSvgCoords({ x: ev.clientX, y: ev.clientY });
        onPointerLeave(point);
      }
    },
    [onPointerLeave, calculateSvgCoords],
  );

  return (
    <>
      <NoInteraction>{children}</NoInteraction>

      <rect
        fill="transparent"
        height="100%"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        width="100%"
        cursor={shapeCursor}
      />
    </>
  );
}
