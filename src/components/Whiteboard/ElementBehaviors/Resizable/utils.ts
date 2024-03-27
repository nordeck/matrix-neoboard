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

import { clamp } from 'lodash';
import { calculateBoundingRectForPoints, Point } from '../../../../state';
import { ElementOverrideUpdate } from '../../../ElementOverridesProvider';
import { snapToGrid } from '../../Grid';
import { DragEvent } from './ResizeHandle';
import {
  Dimensions,
  HandlePosition,
  HandleProperties,
  LineElementHandlePosition,
  LineElementHandleProperties,
  ResizableProperties,
} from './types';

export function isLineElementHandleProperties(
  handleProperties: HandleProperties,
): handleProperties is LineElementHandleProperties {
  return (
    handleProperties.handlePosition === 'start' ||
    handleProperties.handlePosition === 'end'
  );
}

function computeDrag(
  event: DragEvent,
  viewportWidth: number,
  viewportHeight: number,
  gridCellSize?: number,
): { dragX: number; dragY: number } {
  const rawDragX = clamp(event.x, 0, viewportWidth);
  const rawDragY = clamp(event.y, 0, viewportHeight);

  const dragX =
    gridCellSize === undefined ? rawDragX : snapToGrid(rawDragX, gridCellSize);
  const dragY =
    gridCellSize === undefined ? rawDragY : snapToGrid(rawDragY, gridCellSize);

  return { dragX, dragY };
}

export function calculateDragOrigin(
  handlePosition: HandlePosition,
  startDimensions: Dimensions,
): { dragOriginX: number; dragOriginY: number } {
  switch (handlePosition) {
    case 'left':
    case 'topLeft':
    case 'top':
      return {
        dragOriginX: startDimensions.x + startDimensions.width,
        dragOriginY: startDimensions.y + startDimensions.height,
      };
    case 'topRight':
      return {
        dragOriginX: startDimensions.x,
        dragOriginY: startDimensions.y + startDimensions.height,
      };
    case 'right':
    case 'bottomRight':
    case 'bottom':
      return {
        dragOriginX: startDimensions.x,
        dragOriginY: startDimensions.y,
      };
    case 'bottomLeft':
      return {
        dragOriginX: startDimensions.x + startDimensions.width,
        dragOriginY: startDimensions.y,
      };
  }
}

export function calculateDragDimension(
  dragOrigin: number,
  dragPosition: number,
  lowerSizeLimit?: number,
  upperSizeLimit?: number,
): { position: number; size: number; inverted: boolean } {
  const inverted = dragPosition < dragOrigin;
  const constrainedDragPosition =
    lowerSizeLimit === undefined
      ? dragPosition
      : clamp(
          dragPosition,
          dragOrigin - lowerSizeLimit,
          dragOrigin + (upperSizeLimit ?? lowerSizeLimit),
        );
  const position = inverted ? constrainedDragPosition : dragOrigin;
  const dimension = inverted
    ? dragOrigin - constrainedDragPosition
    : constrainedDragPosition - dragOrigin;

  // Force shapes to have at least a dimension of two, to match our validation.
  const size = Math.max(2, dimension);
  return {
    position,
    size,
    inverted,
  };
}

export function calculateDimensions(
  handlePosition: HandlePosition,
  event: DragEvent,
  startDimensions: Dimensions,
  viewportWidth: number,
  viewportHeight: number,
  forceLockAspectRatio: boolean = false,
  gridCellSize?: number,
): Dimensions {
  const { dragX, dragY } = computeDrag(
    event,
    viewportWidth,
    viewportHeight,
    gridCellSize,
  );

  const lockAspectRatio = forceLockAspectRatio || event.lockAspectRatio;

  const dimensions = { ...startDimensions };

  const { dragOriginX, dragOriginY } = calculateDragOrigin(
    handlePosition,
    startDimensions,
  );

  if (lockAspectRatio) {
    if (
      handlePosition === 'topLeft' ||
      handlePosition === 'bottomRight' ||
      handlePosition === 'topRight' ||
      handlePosition === 'bottomLeft'
    ) {
      const risingDiagonal =
        handlePosition === 'topRight' || handlePosition === 'bottomLeft';
      const aspectRatio = startDimensions.height / startDimensions.width;
      // calculate the best possible coords without leaving the viewport or
      // loosing the aspect ratio!
      const maxHeightDown = risingDiagonal
        ? viewportHeight - dragOriginY
        : dragOriginY;
      const maxHeightUp = risingDiagonal
        ? dragOriginY
        : viewportHeight - dragOriginY;
      const maxWidthDown = maxHeightDown / aspectRatio;
      const maxWidthUp = maxHeightUp / aspectRatio;

      const { position, size, inverted } = calculateDragDimension(
        dragOriginX,
        dragX,
        maxWidthDown,
        maxWidthUp,
      );

      dimensions.x = position;
      dimensions.width = size;
      dimensions.y =
        (risingDiagonal && !inverted) || (!risingDiagonal && inverted)
          ? dragOriginY - size * aspectRatio
          : dragOriginY;
      dimensions.height = size * aspectRatio;
    } else if (handlePosition === 'top' || handlePosition === 'bottom') {
      const aspectRatio = startDimensions.width / startDimensions.height;
      // calculate the best possible coords without leaving the viewport or
      // loosing the aspect ratio!
      const centerX = startDimensions.x + startDimensions.width / 2;
      const maxWidth = Math.min(centerX, viewportWidth - centerX) * 2;
      const maxHeight = maxWidth / aspectRatio;

      const { position, size } = calculateDragDimension(
        dragOriginY,
        dragY,
        maxHeight,
      );

      dimensions.y = position;
      dimensions.height = size;
      dimensions.x = centerX - (size * aspectRatio) / 2;
      dimensions.width = size * aspectRatio;
    } else if (handlePosition === 'left' || handlePosition === 'right') {
      const aspectRatio = startDimensions.height / startDimensions.width;
      // calculate the best possible coords without leaving the viewport or
      // loosing the aspect ratio!
      const centerY = startDimensions.y + startDimensions.height / 2;
      const maxHeight = Math.min(centerY, viewportHeight - centerY) * 2;
      const maxWidth = maxHeight / aspectRatio;

      const { position, size } = calculateDragDimension(
        dragOriginX,
        dragX,
        maxWidth,
      );

      dimensions.x = position;
      dimensions.width = size;
      dimensions.y = centerY - (size * aspectRatio) / 2;
      dimensions.height = size * aspectRatio;
    }
  } else {
    if (
      handlePosition === 'topLeft' ||
      handlePosition === 'top' ||
      handlePosition === 'topRight' ||
      handlePosition === 'bottom' ||
      handlePosition === 'bottomLeft' ||
      handlePosition === 'bottomRight'
    ) {
      const { position, size } = calculateDragDimension(dragOriginY, dragY);
      dimensions.y = position;
      dimensions.height = size;
    }

    if (
      handlePosition === 'topLeft' ||
      handlePosition === 'left' ||
      handlePosition === 'bottomLeft' ||
      handlePosition === 'topRight' ||
      handlePosition === 'right' ||
      handlePosition === 'bottomRight'
    ) {
      const { position, size } = calculateDragDimension(dragOriginX, dragX);
      dimensions.x = position;
      dimensions.width = size;
    }
  }

  return dimensions;
}

function computeResizingOfLineElement(
  handlePosition: LineElementHandlePosition,
  resizableProperties: ResizableProperties,
  dragX: number,
  dragY: number,
): ElementOverrideUpdate[] {
  const [elementId, element] = Object.entries(resizableProperties.elements)[0];

  if (element.type !== 'path' || element.kind !== 'line') {
    return [];
  }

  const start = element.points[0];
  const end = element.points[element.points.length - 1];

  const cursor = {
    x: dragX - resizableProperties.x,
    y: dragY - resizableProperties.y,
  };

  let newPoints: Point[];

  if (handlePosition === 'start') {
    newPoints = [cursor, end];
  } else {
    newPoints = [start, cursor];
  }

  const boundingRect = calculateBoundingRectForPoints(newPoints);

  return [
    {
      elementId,
      elementOverride: {
        position: {
          x: resizableProperties.x + boundingRect.offsetX,
          y: resizableProperties.y + boundingRect.offsetY,
        },
        points: newPoints.map((point) => ({
          x: point.x - boundingRect.offsetX,
          y: point.y - boundingRect.offsetY,
        })),
      },
    },
  ];
}

export function computeResizing(
  handleProperties: HandleProperties,
  event: DragEvent,
  viewportWidth: number,
  viewportHeight: number,
  forceLockAspectRatio: boolean = false,
  gridCellSize?: number,
  resizableProperties?: ResizableProperties,
): ElementOverrideUpdate[] {
  if (!resizableProperties) {
    return [];
  }

  if (isLineElementHandleProperties(handleProperties)) {
    const { dragX, dragY } = computeDrag(
      event,
      viewportWidth,
      viewportHeight,
      gridCellSize,
    );

    return computeResizingOfLineElement(
      handleProperties.handlePosition,
      resizableProperties,
      dragX,
      dragY,
    );
  }

  const dimensions = calculateDimensions(
    handleProperties.handlePosition,
    event,
    resizableProperties,
    viewportWidth,
    viewportHeight,
    forceLockAspectRatio,
    gridCellSize,
  );

  return Object.entries(resizableProperties.elements).map(
    ([elementId, element]) => {
      return {
        elementId,
        elementOverride: {
          position: {
            x:
              dimensions.x +
              ((element.position.x - resizableProperties.x) /
                resizableProperties.width) *
                dimensions.width,
            y:
              dimensions.y +
              ((element.position.y - resizableProperties.y) /
                resizableProperties.height) *
                dimensions.height,
          },
          width:
            element.type === 'shape'
              ? (element.width / resizableProperties.width) * dimensions.width
              : undefined,
          height:
            element.type === 'shape'
              ? (element.height / resizableProperties.height) *
                dimensions.height
              : undefined,
          points:
            element.type === 'path'
              ? element.points.map((point) => ({
                  x: (point.x / resizableProperties.width) * dimensions.width,
                  y: (point.y / resizableProperties.height) * dimensions.height,
                }))
              : undefined,
        },
      };
    },
  );
}
