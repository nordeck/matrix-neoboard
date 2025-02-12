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
import {
  calculateBoundingRectForPoints,
  Elements,
  PathElement,
  Point,
} from '../../../../state';
import { ElementOverrideUpdate } from '../../../ElementOverridesProvider';
import { snapToGrid } from '../../Grid';
import { pathElementGetConnectedNotSelectedElements } from '../utils';
import { DragEvent } from './ResizeHandle';
import {
  Dimensions,
  HandlePosition,
  HandlePositionName,
  LineElementHandlePosition,
  LineElementHandlePositionName,
  ResizableProperties,
} from './types';

export function isLineElementHandlePosition(
  handlePosition: HandlePosition,
): handlePosition is LineElementHandlePosition {
  return handlePosition.name === 'start' || handlePosition.name === 'end';
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
  handlePositionName: HandlePositionName,
  startDimensions: Dimensions,
): { dragOriginX: number; dragOriginY: number } {
  switch (handlePositionName) {
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

  // Force shapes to have at least a dimension of one
  const size = Math.max(1, dimension);
  return {
    position,
    size,
    inverted,
  };
}

export function calculateDimensions(
  handlePositionName: HandlePositionName,
  event: DragEvent,
  startDimensions: Dimensions,
  viewportWidth: number,
  viewportHeight: number,
  invertLockAspectRatio: boolean = false,
  gridCellSize?: number,
): Dimensions {
  const { dragX, dragY } = computeDrag(
    event,
    viewportWidth,
    viewportHeight,
    gridCellSize,
  );

  const lockAspectRatio = invertLockAspectRatio
    ? !event.lockAspectRatio
    : event.lockAspectRatio;
  const dimensions = { ...startDimensions };

  const { dragOriginX, dragOriginY } = calculateDragOrigin(
    handlePositionName,
    startDimensions,
  );

  if (lockAspectRatio) {
    if (
      handlePositionName === 'topLeft' ||
      handlePositionName === 'bottomRight' ||
      handlePositionName === 'topRight' ||
      handlePositionName === 'bottomLeft'
    ) {
      const risingDiagonal =
        handlePositionName === 'topRight' ||
        handlePositionName === 'bottomLeft';
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
    } else if (
      handlePositionName === 'top' ||
      handlePositionName === 'bottom'
    ) {
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
    } else if (
      handlePositionName === 'left' ||
      handlePositionName === 'right'
    ) {
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
      handlePositionName === 'topLeft' ||
      handlePositionName === 'top' ||
      handlePositionName === 'topRight' ||
      handlePositionName === 'bottom' ||
      handlePositionName === 'bottomLeft' ||
      handlePositionName === 'bottomRight'
    ) {
      const { position, size } = calculateDragDimension(dragOriginY, dragY);
      dimensions.y = position;
      dimensions.height = size;
    }

    if (
      handlePositionName === 'topLeft' ||
      handlePositionName === 'left' ||
      handlePositionName === 'bottomLeft' ||
      handlePositionName === 'topRight' ||
      handlePositionName === 'right' ||
      handlePositionName === 'bottomRight'
    ) {
      const { position, size } = calculateDragDimension(dragOriginX, dragX);
      dimensions.x = position;
      dimensions.width = size;
    }
  }

  return dimensions;
}

type LinePosition = {
  position: Point;
  points: Point[];
};

function computeResizingOfLine(
  handlePositionName: LineElementHandlePositionName,
  { position, points }: LinePosition,
  dragX: number,
  dragY: number,
): LinePosition {
  const start = points[0];
  const end = points[points.length - 1];

  const cursor = {
    x: dragX - position.x,
    y: dragY - position.y,
  };

  let newPoints: Point[];

  if (handlePositionName === 'start') {
    newPoints = [cursor, end];
  } else {
    newPoints = [start, cursor];
  }

  const boundingRect = calculateBoundingRectForPoints(newPoints);

  return {
    position: {
      x: position.x + boundingRect.offsetX,
      y: position.y + boundingRect.offsetY,
    },
    points: newPoints.map((point) => ({
      x: point.x - boundingRect.offsetX,
      y: point.y - boundingRect.offsetY,
    })),
  };
}

export function computeResizing(
  handlePosition: HandlePosition,
  event: DragEvent,
  viewportWidth: number,
  viewportHeight: number,
  invertLockAspectRatio: boolean = false,
  gridCellSize?: number,
  resizableProperties?: ResizableProperties,
): ElementOverrideUpdate[] {
  if (!resizableProperties) {
    return [];
  }

  if (isLineElementHandlePosition(handlePosition)) {
    const { dragX, dragY } = computeDrag(
      event,
      viewportWidth,
      viewportHeight,
      gridCellSize,
    );

    const [elementId, element] = Object.entries(
      resizableProperties.elements,
    )[0];
    if (element.type !== 'path' || element.kind !== 'line') {
      return [];
    }

    const linePosition = computeResizingOfLine(
      handlePosition.name,
      {
        position: element.position,
        points: element.points,
      },
      dragX,
      dragY,
    );

    return [
      {
        elementId,
        elementOverride: linePosition,
      },
    ];
  }

  const dimensions = calculateDimensions(
    handlePosition.name,
    event,
    resizableProperties,
    viewportWidth,
    viewportHeight,
    invertLockAspectRatio,
    gridCellSize,
  );

  const res: ElementOverrideUpdate[] = Object.entries(
    resizableProperties.elements,
  ).map(([elementId, element]) => {
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
          element.type === 'shape' || element.type === 'image'
            ? (element.width / resizableProperties.width) * dimensions.width
            : undefined,
        height:
          element.type === 'shape' || element.type === 'image'
            ? (element.height / resizableProperties.height) * dimensions.height
            : undefined,
        points:
          element.type === 'path'
            ? element.points.map((point) => ({
                x: (point.x / resizableProperties.width) * dimensions.width,
                y: (point.y / resizableProperties.height) * dimensions.height,
              }))
            : undefined,
      },
      pathElementDisconnectElements: pathElementGetConnectedNotSelectedElements(
        element,
        resizableProperties.elements,
      ),
    };
  });

  if (resizableProperties.connectingPathElements) {
    res.push(
      ...computeResizingConnectingPathElements(
        resizableProperties.connectingPathElements,
        resizableProperties.elements,
        resizableProperties,
        dimensions,
      ),
    );
  }

  return res;
}

export function computeResizingConnectingPathElements(
  connectingPathElements: Record<string, PathElement>,
  elements: Elements,
  resizableProperties: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  dimensions: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
): ElementOverrideUpdate[] {
  const res: ElementOverrideUpdate[] = [];

  for (const [elementId, element] of Object.entries(connectingPathElements)) {
    const eos = computeResizingConnectingPathElement(
      {
        elementId,
        element,
      },
      elements,
      resizableProperties,
      dimensions,
    );
    if (eos) {
      res.push(eos);
    }
  }

  return res;
}

function computeResizingConnectingPathElement(
  {
    elementId,
    element,
  }: {
    elementId: string;
    element: PathElement;
  },
  elements: Elements,
  resizableProperties: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
  dimensions: {
    x: number;
    y: number;
    width: number;
    height: number;
  },
): ElementOverrideUpdate | undefined {
  if (!(element.connectedElementStart || element.connectedElementEnd)) {
    return undefined;
  }

  let linePosition: LinePosition = {
    position: element.position,
    points: element.points,
  };

  const connectedElements = [
    element.connectedElementStart,
    element.connectedElementEnd,
  ];
  for (let i = 0; i < connectedElements.length; i++) {
    const connectedElementId = connectedElements[i];
    if (connectedElementId && elements[connectedElementId] !== undefined) {
      const pointX = element.position.x + element.points[i].x;
      const pointY = element.position.y + element.points[i].y;

      const newPointX =
        dimensions.x +
        ((pointX - resizableProperties.x) / resizableProperties.width) *
          dimensions.width;

      const newPointY =
        dimensions.y +
        ((pointY - resizableProperties.y) / resizableProperties.height) *
          dimensions.height;

      const positionName = i === 0 ? 'start' : 'end';
      linePosition = computeResizingOfLine(
        positionName,
        linePosition,
        newPointX,
        newPointY,
      );
    }
  }

  return {
    elementId: elementId,
    elementOverride: linePosition,
  };
}

export function computeResizingConnectingPathElementOverDeltaPoints(
  {
    elementId,
    element,
  }: {
    elementId: string;
    element: PathElement;
  },
  elements: Elements,
  deltaPoints: (Point | undefined)[],
): ElementOverrideUpdate | undefined {
  if (!(element.connectedElementStart || element.connectedElementEnd)) {
    return undefined;
  }

  let linePosition: LinePosition = {
    position: element.position,
    points: element.points,
  };

  const connectedElements = [
    element.connectedElementStart,
    element.connectedElementEnd,
  ];
  for (let i = 0; i < connectedElements.length; i++) {
    const connectedElementId = connectedElements[i];
    const deltaPoint = deltaPoints[i];

    if (
      connectedElementId &&
      elements[connectedElementId] !== undefined &&
      deltaPoint
    ) {
      const pointX = element.position.x + element.points[i].x;
      const pointY = element.position.y + element.points[i].y;

      const newPointX = pointX + deltaPoint.x;
      const newPointY = pointY + deltaPoint.y;

      const positionName = i === 0 ? 'start' : 'end';
      linePosition = computeResizingOfLine(
        positionName,
        linePosition,
        newPointX,
        newPointY,
      );
    }
  }

  return {
    elementId: elementId,
    elementOverride: linePosition,
  };
}
