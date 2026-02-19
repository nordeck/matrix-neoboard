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
import { clamp } from 'lodash';
import { Dispatch, RefObject, useCallback, useRef, useState } from 'react';
import { DraggableCore, DraggableData, DraggableEvent } from 'react-draggable';
import { Point } from '../../../../state';
import { useLayoutState } from '../../../Layout';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { useSvgScaleContext } from '../../SvgScaleContext';
import {
  angleBetweenPoints,
  calculateRotatorHandlePosition,
  rotatePoint,
} from './rotatorMath';

export type RotatorHandlePosition = {
  containerWidth: number;
  containerHeight: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
  elementId?: undefined;
};

export type RotateHandleProps = {
  handlePosition: RotatorHandlePosition;
  onDrag?: Dispatch<DragEvent>;
  onDragStart?: Dispatch<DragEvent>;
  onDragStop?: Dispatch<DragEvent>;
};

export type DragEvent = {
  newAngle: number;
  lockAspectRatio: boolean;
};

export function RotateHandler(props: RotateHandleProps) {
  const { scale } = useSvgScaleContext();
  const nodeRef = useRef<SVGRectElement>(null);
  const { calculateSvgCoords } = useSvgCanvasContext();

  const { handlePosition: position, onDrag, onDragStart, onDragStop } = props;

  const { isRotating } = useLayoutState();

  const { x, y, width, height } = calculateRotatorHandlePosition({
    containerWidth: position.containerWidth,
    containerHeight: position.containerHeight,
    scale,
  });
  const { viewportWidth, viewportHeight } = useSvgCanvasContext();

  const [handlePosWhenRatating, setHandlePosWhenRotating] = useState<
    Point | undefined
  >(undefined);

  const [rotationRef, setRotationRef] = useState<
    { x: number; y: number; rot: number } | undefined
  >(undefined);

  const dispatchDragEvent = (
    dragEvent: Dispatch<DragEvent> | undefined,
    event: DraggableEvent,
    data: DraggableData,
  ) => {
    if (!rotationRef) {
      if (dragEvent) {
        dragEvent({
          newAngle: position.rotation,
          lockAspectRatio: event.shiftKey,
        });
      }
      setHandlePosWhenRotating(undefined);
      return;
    }

    const handle = {
      x: rotationRef.x,
      y: rotationRef.y,
    };

    const cursor = calculateSvgCoords({
      x: clamp(data.x * scale, 0, viewportWidth),
      y: clamp(data.y * scale, 0, viewportHeight),
    });

    const center = {
      x: position.containerWidth / 2.0 + position.offsetX,
      y: position.containerHeight / 2.0 + position.offsetY,
    };

    const step = event.shiftKey ? 45 : 1;

    const angle = angleBetweenPoints(handle, cursor, center);

    // makes 0..360 angle
    const clampAngle = (angle: number) => ((angle % 360) + 360) % 360;

    const stepFunction = (angle: number, step: number): number => {
      if (step === 0) return 0;
      const times = Math.floor(angle / step);
      return step * times;
    };

    const rotDeg = clampAngle(stepFunction(angle + rotationRef.rot, step));

    // Rotate the handle, specifically it's center point to the same angle.
    const rotatedHandle = rotatePoint(
      {
        x: x + position.offsetX + width / 2, // brings handle and rotation center to the same
        y: y + position.offsetY + height / 2, // global coordinate system
      },
      center,
      angle,
    );
    setHandlePosWhenRotating({
      x: rotatedHandle.x - position.offsetX - width / 2, // shifts the rotated handle center back to
      y: rotatedHandle.y - position.offsetY - height / 2, // it's local coords
    });

    if (dragEvent) {
      dragEvent({
        newAngle: rotDeg,
        lockAspectRatio: event.shiftKey,
      });
    }
  };

  const handleStart = (event: DraggableEvent, data: DraggableData) => {
    const cursor = calculateSvgCoords({
      x: clamp(data.x * scale, 0, viewportWidth),
      y: clamp(data.y * scale, 0, viewportHeight),
    });
    setRotationRef({ x: cursor.x, y: cursor.y, rot: position.rotation ?? 0 });
    dispatchDragEvent(onDragStart, event, data);
  };

  const handleDrag = (event: DraggableEvent, data: DraggableData) => {
    if (!onDrag) return;
    dispatchDragEvent(onDrag, event, data);
  };

  const handleMouseDown = useCallback((ev: MouseEvent) => {
    // Avoid passing mouse events down into the moveable element
    ev.stopPropagation();
  }, []);

  const handleStop = (event: DraggableEvent, data: DraggableData) => {
    setRotationRef(undefined);
    setHandlePosWhenRotating(undefined);
    dispatchDragEvent(onDragStop, event, data);
  };

  const theme = useTheme();
  const selectionAnchorCornerRadius = 3 / scale;
  const selectionBorderWidth = 2 / scale;

  const translatedHandle: Point =
    isRotating && handlePosWhenRatating
      ? { x: handlePosWhenRatating.x, y: handlePosWhenRatating.y }
      : { x, y };

  return (
    <g>
      <g data-testid={`rotate-handle-icon`}>
        <svg
          width={width - selectionBorderWidth}
          height={height - selectionBorderWidth}
          transform={`translate(${translatedHandle.x + selectionBorderWidth / 2} ${translatedHandle.y + selectionBorderWidth / 2})`}
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
          data-testid={`rotate-handle`}
          cursor={'grab'}
          fill={'transparent'}
          height={height}
          ref={nodeRef}
          stroke={theme.palette.primary.main}
          strokeWidth={selectionBorderWidth}
          transform={`translate(${translatedHandle.x} ${translatedHandle.y})`}
          width={width}
          rx={selectionAnchorCornerRadius}
          ry={selectionAnchorCornerRadius}
        ></rect>
      </DraggableCore>
    </g>
  );
}

export type HandlePos = {
  containerWidth: number;
  containerHeight: number;
};
