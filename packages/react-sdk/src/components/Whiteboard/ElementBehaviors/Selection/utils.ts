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

import {
  BoundingRect,
  calculateBoundingRectForPoints,
  ImageElement,
  Point,
  rotatePoint,
  ShapeElement,
} from '../../../../state';
import { calculateRotationHandleCenter } from '../utils';

export function calculateBoundingRectForElementWithRotationHandle(
  { position: { x, y }, width, height, rotation }: ShapeElement | ImageElement,
  scale: number,
): BoundingRect {
  const handleCenter = calculateRotationHandleCenter({
    containerHeight: height,
    scale,
  });

  // bunch of points at the boundaries
  const points: Point[] = [
    { x: x, y: y },
    { x: x + width, y: y },
    { x: x, y: y + height },
    { x: x + width, y: y + height },
    {
      x: x + handleCenter.x,
      y: y + handleCenter.y,
    },
  ];

  const center = {
    x: x + width / 2,
    y: y + height / 2,
  };

  const rotatedPoints = points.map((p) =>
    rotatePoint(p, center, rotation ?? 0),
  );
  const {
    offsetX,
    offsetY,
    width: rectWidth,
    height: rectHeight,
  } = calculateBoundingRectForPoints(rotatedPoints);

  return {
    offsetX,
    offsetY,
    width: rectWidth,
    height: rectHeight,
  };
}
