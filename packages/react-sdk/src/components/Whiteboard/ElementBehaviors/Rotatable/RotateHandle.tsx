/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { useTheme } from '@mui/material';
import {
  Dispatch,
  RefObject,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { DraggableCore, DraggableData, DraggableEvent } from 'react-draggable';
import { angleBetweenPoints, Point, rotatePoint } from '../../../../state';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { useSvgScaleContext } from '../../SvgScaleContext';
import { calculateRotationHandleCenter, clampAngle } from '../utils';

type RotateHandleProps = {
  handlePosition: HandlePosition;
  onDrag?: Dispatch<RotateHandleDragEvent>;
  onDragStart?: Dispatch<RotateHandleDragEvent>;
  onDragStop?: Dispatch<RotateHandleDragEvent>;
};

type HandlePosition = {
  offsetX: number;
  offsetY: number;
  containerWidth: number;
  containerHeight: number;
  rotation: number;
};

export type RotateHandleDragEvent = {
  newAngle: number;
  referenceAngle: number;
  angleSnap: boolean;
};

export function RotateHandle({
  handlePosition: {
    offsetX,
    offsetY,
    containerWidth,
    containerHeight,
    rotation,
  },
  onDrag,
  onDragStart,
  onDragStop,
}: RotateHandleProps) {
  const nodeRef = useRef<SVGRectElement>(null);
  const [rotationInitialPosition, setRotationInitialPosition] = useState<
    { x: number; y: number; rotation: number } | undefined
  >(undefined);

  const { scale } = useSvgScaleContext();
  const { calculateSvgCoords } = useSvgCanvasContext();

  const containerCenter: Point = useMemo(
    () => ({
      x: offsetX + containerWidth / 2,
      y: offsetY + containerHeight / 2,
    }),
    [containerWidth, containerHeight, offsetX, offsetY],
  );

  const dispatchDragEvent = useCallback(
    (
      dragEvent: Dispatch<RotateHandleDragEvent> | undefined,
      event: DraggableEvent,
      data: DraggableData,
    ) => {
      if (!rotationInitialPosition) {
        if (dragEvent) {
          dragEvent({
            newAngle: rotation,
            referenceAngle: rotation,
            angleSnap: event.shiftKey,
          });
        }
        return;
      }

      const cursor = calculateSvgCoords({
        x: data.x * scale,
        y: data.y * scale,
      });

      const step = event.shiftKey ? 45 : 1;

      const initial = {
        x: rotationInitialPosition.x,
        y: rotationInitialPosition.y,
      };
      const angle = angleBetweenPoints(initial, cursor, containerCenter);

      const angleInteger = clampAngle(
        snapAngleToStep(angle + rotationInitialPosition.rotation, step),
      );

      if (dragEvent) {
        dragEvent({
          newAngle: angleInteger,
          referenceAngle: rotationInitialPosition.rotation,
          angleSnap: event.shiftKey,
        });
      }
    },
    [
      calculateSvgCoords,
      rotation,
      rotationInitialPosition,
      scale,
      containerCenter,
    ],
  );

  const handleStart = useCallback(
    (event: DraggableEvent, data: DraggableData) => {
      const cursor = calculateSvgCoords({
        x: data.x * scale,
        y: data.y * scale,
      });
      setRotationInitialPosition({
        x: cursor.x,
        y: cursor.y,
        rotation,
      });
      dispatchDragEvent(onDragStart, event, data);
    },
    [calculateSvgCoords, dispatchDragEvent, onDragStart, rotation, scale],
  );

  const handleDrag = useCallback(
    (event: DraggableEvent, data: DraggableData) => {
      if (!onDrag) return;
      dispatchDragEvent(onDrag, event, data);
    },
    [dispatchDragEvent, onDrag],
  );

  const handleMouseDown = useCallback((ev: MouseEvent) => {
    // Avoid passing mouse events down into the moveable element
    ev.stopPropagation();
  }, []);

  const handleStop = useCallback(
    (event: DraggableEvent, data: DraggableData) => {
      setRotationInitialPosition(undefined);
      dispatchDragEvent(onDragStop, event, data);
    },
    [dispatchDragEvent, onDragStop],
  );

  const handleSize = 16 / scale;

  const { x, y }: Point = useMemo(() => {
    const handleContainerCenter = calculateRotationHandleCenter({
      containerHeight,
      scale,
    });

    // brings handle and rotation center to the same global coordinate system
    const point = {
      x: offsetX + handleContainerCenter.x,
      y: offsetY + handleContainerCenter.y,
    };
    const rotatedPoint = rotatePoint(point, containerCenter, rotation);

    // shifts the rotated handle back to its local coordinates
    return {
      x: rotatedPoint.x - offsetX - handleSize / 2,
      y: rotatedPoint.y - offsetY - handleSize / 2,
    };
  }, [
    containerCenter,
    offsetX,
    offsetY,
    containerHeight,
    rotation,
    handleSize,
    scale,
  ]);

  const theme = useTheme();
  const selectionAnchorCornerRadius = 3 / scale;
  const selectionBorderWidth = 2 / scale;

  return (
    <g>
      <g
        data-testid="rotate-handle-icon"
        transform={`translate(${x + selectionBorderWidth / 2} ${y + selectionBorderWidth / 2})`}
      >
        <svg
          width={handleSize - selectionBorderWidth}
          height={handleSize - selectionBorderWidth}
          viewBox={'0 0 417 417'}
        >
          <rect width="100%" height="100%" fill="white" />
          <path
            d="M48.302,46.101L45.326,166.934L173.302,166.934L131.04,123.106C131.04,123.106 167.945,73.482 235.802,91.339C303.659,109.196 304.138,174.96 319.135,208.333L379.254,208.333C379.254,208.333 365.401,60.445 226.278,38.958C162.675,29.135 99.492,89.553 99.492,89.553L48.302,46.101"
            style={{
              fill: theme.palette.primary.main,
              stroke: theme.palette.primary.main,
            }}
          />
          <path
            d="M375.663,361.245L375.745,240.375L247.806,243.439L291.105,286.243C291.105,286.243 255.399,336.737 187.134,320.509C118.869,304.282 116.815,238.549 101.023,205.544L40.921,206.984C40.921,206.984 58.311,354.497 197.909,372.647C261.729,380.945 323.447,319.031 323.447,319.031L375.663,361.245"
            style={{
              fill: theme.palette.primary.main,
              stroke: theme.palette.primary.main,
            }}
          />
        </svg>
      </g>
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
          data-testid="rotate-handle"
          cursor="grab"
          fill="transparent"
          height={handleSize}
          ref={nodeRef}
          stroke={theme.palette.primary.main}
          strokeWidth={selectionBorderWidth}
          transform={`translate(${x} ${y})`}
          width={handleSize}
          rx={selectionAnchorCornerRadius}
          ry={selectionAnchorCornerRadius}
        />
      </DraggableCore>
    </g>
  );
}

function snapAngleToStep(angle: number, step: number): number {
  if (step === 0) return 0;
  const times = Math.round(angle / step);
  return step * times;
}
