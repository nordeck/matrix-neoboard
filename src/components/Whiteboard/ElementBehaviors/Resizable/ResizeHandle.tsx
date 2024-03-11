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

import { Dispatch, RefObject, useCallback, useRef } from 'react';
import { DraggableCore, DraggableData, DraggableEvent } from 'react-draggable';
import { ElementKind } from '../../../../state';
import { useSvgCanvasContext } from '../../SvgCanvas';
import {
  LineElementResizeHandlePosition,
  PolylineAndShapeElementsResizeHandlePosition,
  ResizeHandlePosition,
} from './types';

export type BaseParams = {
  scale: number;
};

export type LineElementParams = BaseParams & {
  elementKind: 'line';
  handlePosition: LineElementResizeHandlePosition;
  handlePositionX?: number;
  handlePositionY?: number;
};

export type PolylineAndShapeElementsParams = BaseParams & {
  elementKind: Exclude<ElementKind, 'line'>;
  handlePosition: PolylineAndShapeElementsResizeHandlePosition;
  containerWidth?: number;
  containerHeight?: number;
};

export type Params = LineElementParams | PolylineAndShapeElementsParams;

export type Result = {
  x: number;
  y: number;
  width: number;
  height: number;
  cursor: string;
};

export function calculateResizeHandlePosition(params: Params): Result {
  const { elementKind, handlePosition, scale } = params;
  const handleWidth = 10 / scale;
  const selectionBorderPadding = 2 / scale;

  if (elementKind === 'line') {
    const { handlePositionX = 0, handlePositionY = 0 } = params;

    switch (handlePosition) {
      case 'start':
        return {
          x: handlePositionX + handleWidth / -2,
          y: handlePositionY + handleWidth / -2,
          width: handleWidth,
          height: handleWidth,
          cursor: 'default',
        };
      case 'end':
        return {
          x: handlePositionX + handleWidth / -2,
          y: handlePositionY + handleWidth / -2,
          width: handleWidth,
          height: handleWidth,
          cursor: 'default',
        };
    }
  } else {
    const { handlePosition, containerWidth = 0, containerHeight = 0 } = params;

    switch (handlePosition) {
      case 'top':
        return {
          x: handleWidth / 2 - selectionBorderPadding,
          y: -handleWidth / 2 - selectionBorderPadding,
          // Make sure we never get negative dimensions, if the element is too small
          width: Math.max(
            0,
            containerWidth + 2 * selectionBorderPadding - handleWidth,
          ),
          height: handleWidth,
          cursor: 'ns-resize',
        };
      case 'topRight':
        return {
          x: containerWidth - handleWidth / 2 + selectionBorderPadding,
          y: -handleWidth / 2 - selectionBorderPadding,
          width: handleWidth,
          height: handleWidth,
          cursor: 'ne-resize',
        };
      case 'right':
        return {
          x: containerWidth + selectionBorderPadding - handleWidth / 2,
          y: handleWidth / 2 - selectionBorderPadding,
          width: handleWidth,
          height: Math.max(
            0,
            containerHeight + 2 * selectionBorderPadding - handleWidth,
          ),
          cursor: 'ew-resize',
        };
      case 'bottomRight':
        return {
          x: containerWidth - handleWidth / 2 + selectionBorderPadding,
          y: containerHeight - handleWidth / 2 + selectionBorderPadding,
          width: handleWidth,
          height: handleWidth,
          cursor: 'se-resize',
        };
      case 'bottom':
        return {
          x: handleWidth / 2 - selectionBorderPadding,
          y: containerHeight - handleWidth / 2 + selectionBorderPadding,
          width: Math.max(
            0,
            containerWidth + 2 * selectionBorderPadding - handleWidth,
          ),
          height: handleWidth,
          cursor: 'ns-resize',
        };
      case 'bottomLeft':
        return {
          x: -handleWidth / 2 - selectionBorderPadding,
          y: containerHeight - handleWidth / 2 + selectionBorderPadding,
          width: handleWidth,
          height: handleWidth,
          cursor: 'sw-resize',
        };
      case 'left':
        return {
          x: -handleWidth / 2 - selectionBorderPadding,
          y: handleWidth / 2 - selectionBorderPadding,
          width: handleWidth,
          height: Math.max(
            0,
            containerHeight + 2 * selectionBorderPadding - handleWidth,
          ),
          cursor: 'ew-resize',
        };
      case 'topLeft':
        return {
          x: -handleWidth / 2 - selectionBorderPadding,
          y: -handleWidth / 2 - selectionBorderPadding,
          width: handleWidth,
          height: handleWidth,
          cursor: 'nw-resize',
        };
    }
  }
}

export type DragEvent = {
  x: number;
  y: number;
  deltaX: number;
  deltaY: number;
  lockAspectRatio: boolean;
};

export type ResizeHandleProps = {
  handlePosition: ResizeHandlePosition;
  handlePositionX?: number;
  handlePositionY?: number;
  containerWidth?: number;
  containerHeight?: number;
  onDrag?: Dispatch<DragEvent>;
  onDragStart?: Dispatch<DragEvent>;
  onDragStop?: Dispatch<DragEvent>;
  elementKind: ElementKind;
};

export function ResizeHandle({
  onDrag,
  onDragStart,
  onDragStop,
  handlePosition,
  handlePositionX,
  handlePositionY,
  containerWidth,
  containerHeight,
  elementKind,
}: ResizeHandleProps) {
  const nodeRef = useRef<SVGRectElement>(null);
  const { scale, calculateSvgCoords } = useSvgCanvasContext();

  let rectAttributes: Result = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    cursor: '',
  };

  if (elementKind === 'line') {
    if (handlePosition === 'start' || handlePosition === 'end') {
      rectAttributes = calculateResizeHandlePosition({
        scale,
        elementKind,
        handlePosition,
        handlePositionX,
        handlePositionY,
      });
    }
  } else {
    if (handlePosition !== 'start' && handlePosition !== 'end') {
      rectAttributes = calculateResizeHandlePosition({
        scale,
        elementKind,
        handlePosition,
        containerWidth,
        containerHeight,
      });
    }
  }

  const { x, y, width, height, cursor } = rectAttributes;

  const dispatchDragEvent = useCallback(
    (
      dragEvent: Dispatch<DragEvent> | undefined,
      event: DraggableEvent,
      data: DraggableData,
    ) => {
      if (dragEvent) {
        dragEvent({
          ...calculateSvgCoords({
            x: data.x * scale,
            y: data.y * scale,
          }),
          deltaX: data.deltaX,
          deltaY: data.deltaY,
          lockAspectRatio: event.shiftKey,
        });
      }
    },
    [calculateSvgCoords, scale],
  );

  const handleDrag = useCallback(
    (event: DraggableEvent, data: DraggableData) => {
      dispatchDragEvent(onDrag, event, data);
    },
    [onDrag, dispatchDragEvent],
  );

  const handleStart = useCallback(
    (event: DraggableEvent, data: DraggableData) => {
      dispatchDragEvent(onDragStart, event, data);
    },
    [onDragStart, dispatchDragEvent],
  );

  const handleStop = useCallback(
    (event: DraggableEvent, data: DraggableData) => {
      dispatchDragEvent(onDragStop, event, data);
    },
    [onDragStop, dispatchDragEvent],
  );

  const handleMouseDown = useCallback((ev: MouseEvent) => {
    // Avoid passing mouse events down into the moveable element
    ev.stopPropagation();
  }, []);

  return (
    <DraggableCore
      // disable the hack since we already added it via <DraggableStyles>.
      // see also https://github.com/react-grid-layout/react-draggable/blob/31798e920647f40308a144a9f989c771755a21db/lib/utils/domFns.js#L154-L166
      enableUserSelectHack={false}
      nodeRef={nodeRef as unknown as RefObject<HTMLElement>}
      onDrag={handleDrag}
      onMouseDown={handleMouseDown}
      onStart={handleStart}
      onStop={handleStop}
      scale={scale}
    >
      <rect
        data-testid={`resize-handle-${handlePosition}`}
        cursor={cursor}
        fill="transparent"
        height={height}
        ref={nodeRef}
        transform={`translate(${x} ${y})`}
        width={width}
      />
    </DraggableCore>
  );
}
