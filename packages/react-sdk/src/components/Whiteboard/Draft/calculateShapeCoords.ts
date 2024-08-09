/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

import { Point } from 'pdfmake/interfaces';
import { ShapeKind } from '../../../state';
import { ShapeSizesState } from '../../../store/shapeSizesSlide';
import { whiteboardHeight, whiteboardWidth } from '../constants';

type UseCalculateShapeCoordsResult = {
  startCoords: Point;
  endCoords: Point;
};

export function calculateShapeCoords(
  kind: ShapeKind,
  point: Point,
  shapeSizes: ShapeSizesState,
): UseCalculateShapeCoordsResult {
  const { xOffset, yOffset } = {
    xOffset: Math.floor(shapeSizes[kind].width / 2),
    yOffset: Math.floor(shapeSizes[kind].height / 2),
  };

  const shapeCoords: UseCalculateShapeCoordsResult = {
    startCoords: { x: point.x - xOffset, y: point.y - yOffset },
    endCoords: { x: point.x + xOffset, y: point.y + yOffset },
  };

  const offset: Point = {
    x: 0,
    y: 0,
  };

  // Calculate an offset, if the coordinates are outside of the whiteboard.
  if (shapeCoords.startCoords.x < 0) {
    offset.x = -shapeCoords.startCoords.x;
  }

  if (shapeCoords.endCoords.x > whiteboardWidth) {
    offset.x = whiteboardWidth - shapeCoords.endCoords.x;
  }

  if (shapeCoords.startCoords.y < 0) {
    offset.y = -shapeCoords.startCoords.y;
  }

  if (shapeCoords.endCoords.y > whiteboardHeight) {
    offset.y = whiteboardHeight - shapeCoords.endCoords.y;
  }

  return shiftCoords(shapeCoords, offset);
}

function shiftCoords(
  shapeCoords: UseCalculateShapeCoordsResult,
  offset: Point,
): UseCalculateShapeCoordsResult {
  return {
    startCoords: {
      x: shapeCoords.startCoords.x + offset.x,
      y: shapeCoords.startCoords.y + offset.y,
    },
    endCoords: {
      x: shapeCoords.endCoords.x + offset.x,
      y: shapeCoords.endCoords.y + offset.y,
    },
  };
}
