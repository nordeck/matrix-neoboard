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
import { Point } from '../../../../state';
import { useConnectionPoint } from '../../../ConnectionPointProvider';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { useSvgScaleContext } from '../../SvgScaleContext';
import { HandlePosition, LineElementHandlePositionName } from './types';
import { isLineElementHandlePosition } from './utils';

function calculateResizeHandlePosition(params: {
  position: HandlePosition;
  scale: number;
}): {
  x: number;
  y: number;
  width: number;
  height: number;
  cursor: string;
} {
  const { position, scale } = params;
  const handleWidth = 10 / scale;
  const selectionBorderPadding = 2 / scale;

  if (isLineElementHandlePosition(position)) {
    const { name, x, y } = position;

    switch (name) {
      case 'start':
        return {
          x: x + handleWidth / -2,
          y: y + handleWidth / -2,
          width: handleWidth,
          height: handleWidth,
          cursor: 'pointer',
        };
      case 'end':
        return {
          x: x + handleWidth / -2,
          y: y + handleWidth / -2,
          width: handleWidth,
          height: handleWidth,
          cursor: 'pointer',
        };
    }
  } else {
    const { name, containerWidth, containerHeight } = position;

    switch (name) {
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

type ConnectData = {
  connectElementId: string;
  connectPoint?: Point;
};

function findConnectData(
  data: DraggableData,
  scale: number,
): ConnectData | undefined {
  const element = document.elementFromPoint(data.x * scale, data.y * scale);

  if (!element) {
    return undefined;
  }

  const connectType = element.getAttribute('data-connect-type');
  if (!connectType) {
    return undefined;
  }

  const connectElementId =
    element.getAttribute('data-connect-element-id') ?? undefined;
  if (!connectElementId) {
    return undefined;
  }

  let connectPoint: Point | undefined;

  if (
    connectType === 'connection-point-area' ||
    connectType === 'connection-point'
  ) {
    const rect = element.getBoundingClientRect();
    connectPoint = {
      x: (rect.x + rect.width / 2) / scale,
      y: (rect.y + rect.height / 2) / scale,
    };
  }

  return {
    connectElementId,
    connectPoint,
  };
}

export type DragEvent = {
  x: number;
  y: number;
  lockAspectRatio: boolean;
  connectData?: DragConnectData;
};

export type DragConnectData = {
  lineHandlePositionName: LineElementHandlePositionName;
  connectToElementId?: string;
};

export type ResizeHandleProps = {
  position: HandlePosition;
  onDrag?: Dispatch<DragEvent>;
  onDragStart?: Dispatch<DragEvent>;
  onDragStop?: Dispatch<DragEvent>;
};

export function ResizeHandle(props: ResizeHandleProps) {
  const nodeRef = useRef<SVGRectElement>(null);
  const { isHandleDragging, setIsHandleDragging, setConnectElementId } =
    useConnectionPoint();
  const { calculateSvgCoords } = useSvgCanvasContext();
  const { scale } = useSvgScaleContext();

  const {
    position: { name },
    onDrag,
    onDragStart,
    onDragStop,
  } = props;

  const { x, y, width, height, cursor } = calculateResizeHandlePosition({
    ...props,
    scale,
  });

  const dispatchDragEvent = useCallback(
    (
      dragEvent: Dispatch<DragEvent> | undefined,
      event: DraggableEvent,
      data: DraggableData,
      connectData: DragConnectData | undefined,
    ) => {
      if (dragEvent) {
        dragEvent({
          ...calculateSvgCoords({
            x: data.x * scale,
            y: data.y * scale,
          }),
          lockAspectRatio: event.shiftKey,
          connectData,
        });
      }
    },
    [calculateSvgCoords, scale],
  );

  const handleDrag = useCallback(
    (event: DraggableEvent, data: DraggableData) => {
      let connectPoint: Point | undefined;

      if (isHandleDragging) {
        const connectData = findConnectData(data, scale);
        setConnectElementId(connectData?.connectElementId);
        connectPoint = connectData?.connectPoint;
      }

      const newData: DraggableData = connectPoint
        ? { ...data, x: connectPoint.x, y: connectPoint.y }
        : data;

      dispatchDragEvent(onDrag, event, newData, undefined);
    },
    [dispatchDragEvent, isHandleDragging, onDrag, scale, setConnectElementId],
  );

  const handleStart = useCallback(
    (event: DraggableEvent, data: DraggableData) => {
      if (name === 'start' || name === 'end') {
        setIsHandleDragging(true);
      }
      dispatchDragEvent(onDragStart, event, data, undefined);
    },
    [dispatchDragEvent, onDragStart, name, setIsHandleDragging],
  );

  const handleStop = useCallback(
    (event: DraggableEvent, data: DraggableData) => {
      let dragConnectData: DragConnectData | undefined;

      if (name === 'start' || name === 'end') {
        const connectData = findConnectData(data, scale);

        dragConnectData = {
          lineHandlePositionName: name,
          connectToElementId:
            connectData?.connectElementId && connectData?.connectPoint
              ? connectData?.connectElementId
              : undefined,
        };

        setConnectElementId(undefined);
        setIsHandleDragging(false);
      }
      dispatchDragEvent(onDragStop, event, data, dragConnectData);
    },
    [
      dispatchDragEvent,
      onDragStop,
      name,
      scale,
      setIsHandleDragging,
      setConnectElementId,
    ],
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
        data-testid={`resize-handle-${name}`}
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
