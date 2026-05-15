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
  Element,
  Elements,
  PathElement,
  Point,
} from '../../../../state';
import {
  ImageElement,
  isRotateableElement,
  ShapeElement,
} from '../../../../state/crdt/documents/elements';
import { ElementOverrideUpdate } from '../../../ElementOverridesProvider';
import { snapToGrid } from '../../Grid';
import {
  checkMultiselect,
  hasRotatedElements,
  rotatePoint,
} from '../Rotatable/rotatorMath';
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

export function computeDragWithRotation(
  event: DragEvent,
  elements: Elements,
  viewportWidth: number,
  viewportHeight: number,
  gridCellSize?: number,
) {
  const elementIds = Object.entries(elements).map((o) => o[0]);

  // at this time we can only resize 1 rotated element
  if (elementIds.length === 1) {
    const _elementId = elementIds[0];
    const element = elements[_elementId];

    if (isRotateableElement(element)) {
      // rotate the cursor point as if it was dragging to resize the non-rotated object
      const angle = element.rotation ?? 0;
      const cursor = { x: event.x, y: event.y };
      const unrotatedDragEventPoint = rotatePoint(
        cursor,
        {
          x: element.position.x + element.width / 2,
          y: element.position.y + element.height / 2,
        },
        -angle,
      );

      const rawDragX = clamp(unrotatedDragEventPoint.x, 0, viewportWidth);
      const rawDragY = clamp(unrotatedDragEventPoint.y, 0, viewportHeight);

      const dragX =
        gridCellSize === undefined
          ? rawDragX
          : snapToGrid(rawDragX, gridCellSize);
      const dragY =
        gridCellSize === undefined
          ? rawDragY
          : snapToGrid(rawDragY, gridCellSize);

      // user tries to rotate a single element, the resize borders are also rotated
      // but this function will return drag deltas as if the object wasn't rotated
      return { dragX, dragY };
    }
  }

  // no rotations involved, resize handles are not rotated
  return computeDrag(event, viewportWidth, viewportHeight, gridCellSize);
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

export function getLockAspectRatio(
  event: DragEvent,
  elements: Elements,
  invertLockAspectRatio: boolean = false,
) {
  const hasRotated = hasRotatedElements(elements);
  const multiselect = checkMultiselect(elements);

  if (hasRotated && multiselect) return true;

  return invertLockAspectRatio ? !event.lockAspectRatio : event.lockAspectRatio;
}

export function calculateDimensions(
  handlePositionName: HandlePositionName,
  elementsPossiblyRotated: Elements,
  event: DragEvent,
  startDimensions: Dimensions,
  viewportWidth: number,
  viewportHeight: number,
  invertLockAspectRatio: boolean = false,
  gridCellSize?: number,
): Dimensions {
  const { dragX, dragY } = computeDragWithRotation(
    event,
    elementsPossiblyRotated,
    viewportWidth,
    viewportHeight,
    gridCellSize,
  );

  const lockAspectRatio = getLockAspectRatio(
    event,
    elementsPossiblyRotated,
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
 * Factory for a point rotating functions when resizing a non-rotated element
 * @param options
 * @returns function that applies the object's current resize transformation to any point
 */
export function pointResizerUnrotatedFactory(
  dimensions: Dimensions,
  resizableProperties: ResizableProperties,
) {
  const pointResizerUnrotated = (p: Point) => {
    const resized = {
      x:
        dimensions.x +
        ((p.x - resizableProperties.x) / resizableProperties.width) *
          dimensions.width,
      y:
        dimensions.y +
        ((p.y - resizableProperties.y) / resizableProperties.height) *
          dimensions.height,
    };
    return resized;
  };
  return pointResizerUnrotated;
}

/**
 * Factory for a point rotating functions when resizing a rotated element
 *  This function will predict where a point on this object will be
 * after applying the resize (in SVG coordinates)
 * it unrotates the point, applies the "unrotated resize logic" and
 * rotates the point over the new center, applying the error shift.
 * @param options
 * @returns function that applies the object's current resize transformation to any point
 */
export function pointResizerRotatedFactory(options: {
  dimensions: Dimensions;
  resizableProperties: ResizableProperties;
  origCenter: Point;
  angle: number;
  newCenter: Point;
  error: Point;
}): (p: Point) => Point {
  const {
    dimensions,
    resizableProperties,
    origCenter,
    angle,
    newCenter,
    error,
  } = options;

  const pointResizerRotated = (p: Point) => {
    const u = rotatePoint(p, origCenter, -angle);
    const pointResizerUnrotated = pointResizerUnrotatedFactory(
      dimensions,
      resizableProperties,
    );
    const resized = pointResizerUnrotated({
      x: u.x,
      y: u.y,
    });
    const n = rotatePoint(resized, newCenter, angle);
    n.x += error.x;
    n.y += error.y;
    return n;
  };

  return pointResizerRotated;
}

/**
 * For an untrotated element.
 * Returns override after resizing and a resizer function specific to the perfomed resize action
 */
export function resizeInfoUnrotated(
  elementId: string,
  element: Element,
  resizableProperties: ResizableProperties,
  dimensions: Dimensions,
) {
  // calculated the point's new "resized" position when the element is unrotated
  const pointResizerUnrotated = pointResizerUnrotatedFactory(
    dimensions,
    resizableProperties,
  );

  const override = {
    elementId,
    elementOverride: {
      position: pointResizerUnrotated({
        x: element.position.x,
        y: element.position.y,
      }),
      width:
        element.type === 'shape' ||
        element.type === 'image' ||
        element.type === 'frame'
          ? (element.width / resizableProperties.width) * dimensions.width
          : undefined,
      height:
        element.type === 'shape' ||
        element.type === 'image' ||
        element.type === 'frame'
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
  };

  return {
    override,
    pointResizerUnrotated,
  };
}

/**
 * For a rotated element.
 * Returns override after resizing and a resizer function specific to the perfomed resize action
 */
export function resizeInfoRotated(
  elementId: string,
  element: ShapeElement | ImageElement,
  dimensions: Dimensions,
  resizableProperties: ResizableProperties,
) {
  const { override } = resizeInfoUnrotated(
    elementId,
    element,
    resizableProperties,
    dimensions,
  );

  // Resizing an object shifts it's center of rotation.
  // Apply adjustment to the offsets of the non rotated object
  // to eliminate the visible shift.
  const origCenter = {
    x: element.position.x + element.width / 2,
    y: element.position.y + element.height / 2,
  };
  const newCenter = {
    x:
      (override.elementOverride?.position?.x ?? 0) +
      (override.elementOverride?.width ?? 0) / 2,
    y:
      (override.elementOverride?.position?.y ?? 0) +
      (override.elementOverride?.height ?? 0) / 2,
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
  const p1 = rotatePoint(testPoint, origCenter, angle);
  const p2 = rotatePoint(testPoint, newCenter, angle);
  const error = {
    x: p1.x - p2.x,
    y: p1.y - p2.y,
  };

  override.elementOverride.position.x += error.x;
  override.elementOverride.position.y += error.y;

  const pointResizerRotated = pointResizerRotatedFactory({
    angle: angle,
    error: error,
    origCenter: origCenter,
    newCenter: newCenter,
    dimensions: dimensions,
    resizableProperties: resizableProperties,
  });

  return {
    override,
    pointResizerRotated,
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
    const { dragX, dragY } = computeDragWithRotation(
      event,
      resizableProperties.elements,
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
    resizableProperties.elements,
    event,
    resizableProperties, // start dimensions
    viewportWidth,
    viewportHeight,
    invertLockAspectRatio,
    gridCellSize,
  );

  const multiselect = checkMultiselect(resizableProperties.elements);

  // pointResizer function will be used to move connected arrows later
  // (so we can repeat the exact same calculations on the connector points)
  const resizeInfo: {
    elementOverride: ElementOverrideUpdate;
    elementId: string;
    pointResizer: (p: Point) => Point;
  }[] = Object.entries(resizableProperties.elements).map(
    ([elementId, element]) => {
      const { override: unrotatedOverride, pointResizerUnrotated } =
        resizeInfoUnrotated(
          elementId,
          element,
          resizableProperties,
          dimensions,
        );

      // Note: in multiselect mode resizing is always performed along the SVG axis
      // and not along the rotated element's axis, thus we skip it.

      if (isRotateableElement(element) && !multiselect && element.rotation) {
        const { override, pointResizerRotated } = resizeInfoRotated(
          elementId,
          element,
          dimensions,
          resizableProperties,
        );
        return {
          elementOverride: override,
          pointResizer: pointResizerRotated,
          elementId,
        };
      }

      return {
        elementOverride: unrotatedOverride,
        pointResizer: pointResizerUnrotated,
        elementId,
      };
    },
  );

  // just collect all the resizer functions into a map elementId->resizerFn
  const resizers: Record<string, (p: Point) => Point> = {};
  for (const o of resizeInfo) {
    if (o.pointResizer) resizers[o.elementId] = o.pointResizer;
  }

  // add resized elements
  const elementOverrides = resizeInfo.map((o) => o.elementOverride);

  // add resized connected elements
  if (resizableProperties.connectingPathElements) {
    elementOverrides.push(
      ...computeResizingConnectingPathElements(
        resizableProperties.connectingPathElements,
        resizableProperties.elements,
        resizableProperties,
        dimensions,
        resizers,
      ),
    );
  }

  return elementOverrides;
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
  resizers?: Record<string, (p: Point) => Point>,
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
      resizers,
    );
    if (eos) {
      res.push(eos);
    }
  }

  return res;
}

export function computeResizingConnectingPathElement(
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
  resizers?: Record<string, (p: Point) => Point>,
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
      const elementWithConnectorPoints = elements[connectedElementId];
      const pointX = element.position.x + element.points[i].x;
      const pointY = element.position.y + element.points[i].y;

      const drag = {
        x:
          dimensions.x +
          ((pointX - resizableProperties.x) / resizableProperties.width) *
            dimensions.width,
        y:
          dimensions.y +
          ((pointY - resizableProperties.y) / resizableProperties.height) *
            dimensions.height,
      };

      const positionName = i === 0 ? 'start' : 'end';

      // predict where a connection point will be for a rotated
      // object using the object's own point rotation function
      if (
        resizers &&
        resizers[connectedElementId] &&
        isRotateableElement(elementWithConnectorPoints) &&
        elementWithConnectorPoints.rotation
      ) {
        const resizeFn = resizers[connectedElementId];
        const resizedPoint = resizeFn({ x: pointX, y: pointY });
        drag.x = resizedPoint.x;
        drag.y = resizedPoint.y;
      }

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
  let linePosition: LinePosition = {
    ...elementLinePosition,
  };

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
