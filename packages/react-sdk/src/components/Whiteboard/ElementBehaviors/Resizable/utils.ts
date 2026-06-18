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

import clamp from 'lodash/clamp';
import {
  calculateBoundingRectForPoints,
  Element,
  Elements,
  isRotatableElement,
  PathElement,
  Point,
  rotatePoint,
} from '../../../../state';
import {
  ElementOverride,
  ElementOverrideUpdate,
} from '../../../ElementOverridesProvider';
import { snapToGrid } from '../../Grid';
import { clampAngle } from '../utils';
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

export function computeDragElements(
  event: DragEvent,
  elements: Elements,
  viewportWidth: number,
  viewportHeight: number,
  gridCellSize?: number,
): { dragX: number; dragY: number } {
  const [element, ...otherElements] = Object.values(elements);

  if (
    element &&
    otherElements.length === 0 &&
    isRotatableElement(element) &&
    element.rotation
  ) {
    // rotate the point as if it was dragging to resize the non-rotated object
    const position = { x: event.x, y: event.y };
    const angle = element.rotation ?? 0;
    const unrotatedPosition = rotatePoint(
      position,
      {
        x: element.position.x + element.width / 2,
        y: element.position.y + element.height / 2,
      },
      -angle,
    );

    // viewport width and height are undefined here to avoid clamp
    return computeDrag(
      unrotatedPosition.x,
      unrotatedPosition.y,
      undefined,
      undefined,
      gridCellSize,
    );
  }

  // no rotations involved, resize handles are not rotated
  return computeDrag(
    event.x,
    event.y,
    viewportWidth,
    viewportHeight,
    gridCellSize,
  );
}

function computeDrag(
  x: number,
  y: number,
  viewportWidth?: number,
  viewportHeight?: number,
  gridCellSize?: number,
): { dragX: number; dragY: number } {
  const rawDragX = viewportWidth ? clamp(x, 0, viewportWidth) : x;
  const rawDragY = viewportHeight ? clamp(y, 0, viewportHeight) : y;

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

export function getLockAspectRatio(
  event: DragEvent,
  elements: Elements,
  invertLockAspectRatio: boolean = false,
): boolean {
  const multiselect = Object.entries(elements).length > 1;
  const hasRotated = Object.entries(elements).some(
    ([_, element]) => isRotatableElement(element) && !!element.rotation,
  );

  // lock aspect ratio, resizing doesn't work correct in this case
  if (multiselect && hasRotated) return true;

  return invertLockAspectRatio ? !event.lockAspectRatio : event.lockAspectRatio;
}

export function calculateDimensions(
  handlePositionName: HandlePositionName,
  elements: Elements,
  event: DragEvent,
  startDimensions: Dimensions,
  viewportWidth: number,
  viewportHeight: number,
  invertLockAspectRatio: boolean = false,
  gridCellSize?: number,
): Dimensions {
  const { dragX, dragY } = computeDragElements(
    event,
    elements,
    viewportWidth,
    viewportHeight,
    gridCellSize,
  );

  const lockAspectRatio = getLockAspectRatio(
    event,
    elements,
    invertLockAspectRatio,
  );

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
    // free-transform, no locked aspect ratio
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

/**
 * Factory for a point transformation function when resizing unrotated element
 * @returns function that transforms points
 */
export function pointResizerUnrotatedFactory(
  startDimensions: Dimensions,
  endDimensions: Dimensions,
): (p: Point) => Point {
  const scaleX = endDimensions.width / startDimensions.width;
  const scaleY = endDimensions.height / startDimensions.height;

  return (p: Point) => {
    return {
      x: endDimensions.x + (p.x - startDimensions.x) * scaleX,
      y: endDimensions.y + (p.y - startDimensions.y) * scaleY,
    };
  };
}

/**
 * Factory for a point transformation function when resizing a rotated element
 * This function will calculate where a point on this object will be
 * after applying the resize (in SVG coordinates)
 * it unrotates the point, applies the "unrotated resize logic" and
 * rotates the point over the new center, applying the error shift.
 * @param options
 * @returns function that transforms points
 */
export function pointResizerRotatedFactory({
  startDimensions,
  endDimensions,
  originalCenter,
  newCenter,
  angle,
  error,
}: {
  startDimensions: Dimensions;
  endDimensions: Dimensions;
  originalCenter: Point;
  newCenter: Point;
  angle: number;
  error: Point;
}): (p: Point) => Point {
  const pointResizerUnrotated = pointResizerUnrotatedFactory(
    startDimensions,
    endDimensions,
  );

  return (p: Point) => {
    const rp = rotatePoint(p, originalCenter, -angle);
    const resized = pointResizerUnrotated({
      x: rp.x,
      y: rp.y,
    });
    const n = rotatePoint(resized, newCenter, angle);
    n.x += error.x;
    n.y += error.y;
    return n;
  };
}

/**
 * Compute element override on resize, also computes a point resize function
 * that could be used to update connected path to this element if any.
 *
 * Rotatable element is resized along its axis,
 * unless forceResizeAlongSvgAxis is set to true.
 * Other elements are resized along SVG axis.
 */
export function computeElementResize(
  element: Element,
  startDimensions: Dimensions,
  endDimensions: Dimensions,
  forceResizeAlongSvgAxis: boolean,
): {
  elementOverride: ElementOverride;
  pointResizer: (p: Point) => Point;
} {
  const pointResizerUnrotated = pointResizerUnrotatedFactory(
    startDimensions,
    endDimensions,
  );

  if (element.type === 'path') {
    const scaleX = endDimensions.width / startDimensions.width;
    const scaleY = endDimensions.height / startDimensions.height;
    return {
      elementOverride: {
        position: pointResizerUnrotated({
          x: element.position.x,
          y: element.position.y,
        }),
        points: element.points.map((point) => ({
          x: point.x * scaleX,
          y: point.y * scaleY,
        })),
      },
      pointResizer: pointResizerUnrotated,
    };
  }

  const overridePosition = pointResizerUnrotated({
    x: element.position.x,
    y: element.position.y,
  });
  const scaleX = endDimensions.width / startDimensions.width;
  const scaleY = endDimensions.height / startDimensions.height;
  const overrideWidth = element.width * scaleX;
  const overrideHeight = element.height * scaleY;

  if (
    !isRotatableElement(element) ||
    forceResizeAlongSvgAxis ||
    (isRotatableElement(element) && !element.rotation)
  ) {
    return {
      elementOverride: {
        position: overridePosition,
        width: overrideWidth,
        height: overrideHeight,
      },
      pointResizer: pointResizerUnrotated,
    };
  }

  // Resizing an object shifts it's center of rotation.
  // Apply adjustment to the offsets of the non rotated object
  // to eliminate the visible shift.
  const originalCenterPoint = {
    x: element.position.x + element.width / 2,
    y: element.position.y + element.height / 2,
  };
  const newCenterPoint = {
    x: overridePosition.x + overrideWidth / 2,
    y: overridePosition.y + overrideHeight / 2,
  };

  // calculate "rotation center shift error" by selecting a
  // point and rotating it around both centers (before and after resize).
  // Used to shift the object (and it's new center of rotation)
  // because some points were not affected by the resize and should remain
  // in their original place.
  const testPoint = {
    x: element.position.x + element.width,
    y: element.position.y + element.height,
  };
  const angle = element.rotation ?? 0;
  const p1 = rotatePoint(testPoint, originalCenterPoint, angle);
  const p2 = rotatePoint(testPoint, newCenterPoint, angle);
  const error = {
    x: p1.x - p2.x,
    y: p1.y - p2.y,
  };

  overridePosition.x += error.x;
  overridePosition.y += error.y;

  const pointResizer = pointResizerRotatedFactory({
    startDimensions,
    endDimensions,
    originalCenter: originalCenterPoint,
    newCenter: newCenterPoint,
    angle: angle,
    error: error,
  });

  return {
    elementOverride: {
      position: overridePosition,
      width: overrideWidth,
      height: overrideHeight,
    },
    pointResizer,
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

  const { elements, connectingPathElements } = resizableProperties;

  if (isLineElementHandlePosition(handlePosition)) {
    const { dragX, dragY } = computeDrag(
      event.x,
      event.y,
      viewportWidth,
      viewportHeight,
      gridCellSize,
    );

    const [elementId, element] = Object.entries(elements)[0];
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

  const startDimensions: Dimensions = {
    x: resizableProperties.x,
    y: resizableProperties.y,
    width: resizableProperties.width,
    height: resizableProperties.height,
  };

  const endDimensions = calculateDimensions(
    handlePosition.name,
    elements,
    event,
    startDimensions,
    viewportWidth,
    viewportHeight,
    invertLockAspectRatio,
    gridCellSize,
  );

  let resizeData: {
    updates: ElementOverrideUpdate[];
    pointResizer: (p: Point) => Point;
  };

  const entries = Object.entries(elements);
  const [head, ...tail] = entries;
  if (head && tail.length === 0) {
    // Resizing of single element is performed along the rotated element's axis
    const [elementId, element] = head;

    const { elementOverride, pointResizer } = computeElementResize(
      element,
      startDimensions,
      endDimensions,
      false,
    );

    resizeData = {
      updates: [
        {
          elementId,
          elementOverride,
        },
      ],
      pointResizer,
    };
  } else {
    // Resizing of multiple elements is performed along the SVG axis
    const updates = entries.map(([elementId, element]) => {
      const { elementOverride } = computeElementResize(
        element,
        startDimensions,
        endDimensions,
        true,
      );

      return {
        elementId,
        elementOverride,
      };
    });

    resizeData = {
      updates,
      pointResizer: pointResizerUnrotatedFactory(
        startDimensions,
        endDimensions,
      ),
    };
  }

  const { updates, pointResizer } = resizeData;

  // add resized connected elements
  if (connectingPathElements) {
    updates.push(
      ...computeResizingConnectingPathElements(
        connectingPathElements,
        elements,
        startDimensions,
        endDimensions,
        pointResizer,
      ),
    );
  }

  return updates;
}

export function computeResizingConnectingPathElements(
  connectingPathElements: Record<string, PathElement>,
  elements: Elements,
  startDimensions: Dimensions,
  endDimensions: Dimensions,
  pointResizer?: (p: Point) => Point,
): ElementOverrideUpdate[] {
  if (!pointResizer) {
    pointResizer = pointResizerUnrotatedFactory(startDimensions, endDimensions);
  }

  const res: ElementOverrideUpdate[] = [];

  for (const [elementId, element] of Object.entries(connectingPathElements)) {
    const eos = computeResizingConnectingPathElement(
      elementId,
      element,
      elements,
      pointResizer,
    );
    if (eos) {
      res.push(eos);
    }
  }

  return res;
}

export function computeResizingConnectingPathElement(
  elementId: string,
  element: PathElement,
  elements: Elements,
  pointResizer: (p: Point) => Point,
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

      const positionName = i === 0 ? 'start' : 'end';

      const drag: Point = pointResizer({ x: pointX, y: pointY });

      linePosition = computeResizingOfLine(
        positionName,
        linePosition,
        drag.x,
        drag.y,
      );
    }
  }

  return {
    elementId: elementId,
    elementOverride: linePosition,
  };
}

export function computeResizingConnectingPathElementOverDeltaPoints(
  elementLinePosition: LinePosition,
  deltaPoints: (Point | undefined)[],
): LinePosition {
  let linePosition: LinePosition = elementLinePosition;

  for (let i = 0; i < deltaPoints.length; i++) {
    const deltaPoint = deltaPoints[i];

    if (deltaPoint) {
      const pointX = linePosition.position.x + linePosition.points[i].x;
      const pointY = linePosition.position.y + linePosition.points[i].y;

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

  return linePosition;
}

const cursors = [
  'ns-resize', // top
  'ne-resize', // top-right
  'ew-resize', // right
  'se-resize',
  'ns-resize',
  'sw-resize',
  'ew-resize',
  'nw-resize',
];

export function rotateCursor(cursor: string, angle: number): string {
  const nAngle = clampAngle(angle);
  const times = Math.round(nAngle / 45);
  const idx = cursors.indexOf(cursor);
  return idx === -1 ? cursor : cursors[(idx + times) % 8];
}
