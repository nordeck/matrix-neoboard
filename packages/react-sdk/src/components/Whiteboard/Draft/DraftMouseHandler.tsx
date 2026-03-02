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
import { Dispatch, MouseEvent, PropsWithChildren, useCallback } from 'react';
import { Point } from '../../../state';
import { ActiveTool, useLayoutState } from '../../Layout';
import { whiteboardHeight, whiteboardWidth } from '../constants';
import { useSvgCanvasContext } from '../SvgCanvas';
import editRoundedUrl from './editRounded.svg?url';

const StickyNoteIconBase64 =
  'data:image/svg+xml;base64,CiAgPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjI0IiBoZWlnaHQ9IjI0Ij4KICAgIDxwYXRoIGQ9Ik0xOSA1djloLTV2NUg1VjV6bTAtMkg1Yy0xLjEgMC0yIC45LTIgMnYxNGMwIDEuMS45IDIgMiAyaDEwbDYtNlY1YzAtMS4xLS45LTItMi0ybS03IDExSDd2LTJoNXptNS00SDdWOGgxMHoiLz4KICA8L3N2Zz4K';

const getCursorStyle = (tool: ActiveTool) => {
  switch (tool) {
    case 'polyline':
      return `url("${editRoundedUrl}") 3 21, crosshair`;
    case 'sticky-note':
      return `url("${StickyNoteIconBase64}") 16 16, auto`;
    default:
      return 'crosshair';
  }
};

const NoInteraction = styled('g')({
  pointerEvents: 'none',
});

export type DraftEvent = {
  point: Point;
  clientX: number;
  clientY: number;
};

export type DraftMouseHandlerProps = PropsWithChildren<{
  onClick?: Dispatch<Point>;
  onMouseDown?: Dispatch<DraftEvent>;
  onMouseLeave?: Dispatch<DraftEvent>;
  onMouseMove?: Dispatch<DraftEvent>;
  onMouseUp?: Dispatch<DraftEvent>;
}>;

export function DraftMouseHandler({
  onClick,
  onMouseUp,
  onMouseLeave,
  onMouseDown,
  onMouseMove,
  children,
}: DraftMouseHandlerProps) {
  const { calculateSvgCoords } = useSvgCanvasContext();
  const { activeTool } = useLayoutState();
  const shapeCursor = getCursorStyle(activeTool);

  const handleClick = useCallback(
    (ev: MouseEvent<SVGRectElement>) => {
      if (onClick) {
        const point = calculateSvgCoords({ x: ev.clientX, y: ev.clientY });
        onClick(point);
      }
    },
    [calculateSvgCoords, onClick],
  );

  const handleMouseUp = useCallback(
    (ev: MouseEvent<SVGRectElement>) => {
      if (onMouseUp) {
        const point = calculateSvgCoords({ x: ev.clientX, y: ev.clientY });
        onMouseUp({ point, clientX: ev.clientX, clientY: ev.clientY });
      }
    },
    [onMouseUp, calculateSvgCoords],
  );

  const handleMouseDown = useCallback(
    (ev: MouseEvent<SVGRectElement>) => {
      if (onMouseDown) {
        const point = calculateSvgCoords({ x: ev.clientX, y: ev.clientY });
        if (activeTool !== 'sticky-note') {
          onMouseDown({ point, clientX: ev.clientX, clientY: ev.clientY });
        }
      }
    },
    [onMouseDown, calculateSvgCoords, activeTool],
  );

  const handleMouseMove = useCallback(
    (ev: MouseEvent<SVGRectElement>) => {
      if (onMouseMove) {
        const point = calculateSvgCoords({ x: ev.clientX, y: ev.clientY });
        onMouseMove({ point, clientX: ev.clientX, clientY: ev.clientY });
      }
    },
    [onMouseMove, calculateSvgCoords],
  );

  const handleMouseLeave = useCallback(
    (ev: MouseEvent<SVGRectElement>) => {
      if (onMouseLeave) {
        const point = calculateSvgCoords({ x: ev.clientX, y: ev.clientY });
        onMouseLeave({ point, clientX: ev.clientX, clientY: ev.clientY });
      }
    },
    [onMouseLeave, calculateSvgCoords],
  );

  return (
    <>
      <NoInteraction>{children}</NoInteraction>

      <rect
        fill="transparent"
        height={whiteboardHeight}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        width={whiteboardWidth}
        cursor={shapeCursor}
      />
    </>
  );
}
