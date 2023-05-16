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

import {
  calculateBoundingRectForPoints,
  PathElement,
  PathKind,
  Point,
  ShapeElement,
  ShapeKind,
} from '../../../state';
import { whiteboardHeight, whiteboardWidth } from '../constants';
import { snapToGrid } from '../Grid';

export function createShape({
  kind,
  startCoords,
  endCoords,
  fillColor,
  gridCellSize,
  sameLength = false,
}: {
  kind: ShapeKind;
  startCoords: Point;
  endCoords: Point;
  fillColor: string;
  gridCellSize?: number;
  sameLength?: boolean;
}): ShapeElement {
  const normalizedStart =
    gridCellSize === undefined
      ? startCoords
      : {
          x: snapToGrid(startCoords.x, gridCellSize),
          y: snapToGrid(startCoords.y, gridCellSize),
        };
  const normalizedEnd =
    gridCellSize === undefined
      ? endCoords
      : {
          x: snapToGrid(endCoords.x, gridCellSize),
          y: snapToGrid(endCoords.y, gridCellSize),
        };
  let {
    offsetX: x,
    offsetY: y,
    width,
    height,
  } = calculateBoundingRectForPoints([normalizedStart, normalizedEnd]);

  if (sameLength) {
    const invertedX = normalizedEnd.x < normalizedStart.x;
    const invertedY = normalizedEnd.y < normalizedStart.y;
    let size = Math.max(width, height);

    if (invertedX) {
      size += Math.min(0, normalizedStart.x - size);
    } else {
      size += Math.min(0, whiteboardWidth - (normalizedStart.x + size));
    }

    if (invertedY) {
      size += Math.min(0, normalizedStart.y - size);
    } else {
      size += Math.min(0, whiteboardHeight - (normalizedStart.y + size));
    }

    width = height = size;

    // Fix the position if we are inverted
    if (invertedX) {
      x = normalizedStart.x - width;
    }

    if (invertedY) {
      y = normalizedStart.y - height;
    }
  }

  return {
    fillColor,
    height,
    position: { x, y },
    type: 'shape',
    kind,
    width,
    text: '',
  };
}

export function createShapeFromPoints({
  kind,
  cursorPoints,
  strokeColor,
  gridCellSize,
  onlyStartAndEndPoints = false,
}: {
  kind: PathKind;
  cursorPoints: Point[];
  strokeColor: string;
  gridCellSize?: number;
  onlyStartAndEndPoints?: boolean;
}): PathElement {
  const points = onlyStartAndEndPoints
    ? [cursorPoints[0], cursorPoints[cursorPoints.length - 1]].map((e) =>
        gridCellSize !== undefined
          ? {
              x: snapToGrid(e.x, gridCellSize),
              y: snapToGrid(e.y, gridCellSize),
            }
          : e
      )
    : cursorPoints;
  const { offsetX, offsetY } = calculateBoundingRectForPoints(points);

  return {
    position: { x: offsetX, y: offsetY },
    type: 'path',
    kind,
    strokeColor,
    points: points.map((e) => ({
      x: e.x - offsetX,
      y: e.y - offsetY,
    })),
  };
}
