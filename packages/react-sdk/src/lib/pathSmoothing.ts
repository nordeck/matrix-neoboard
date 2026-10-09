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

import simplifySvgPath from '@luncheon/simplify-svg-path';
import { Point } from '../state';

/**
 * Renders sequence of points  into a
 * string usable directly as an SVG `<path d="...">` attribute.
 */
export function simplifyPointsToD(
  points: Point[],
  tolerance: number = 2.5,
  precision: number = 5,
) {
  // simplifySvgPath requires at least two points,
  // just return a single M without throwing exceptions.
  if (points.length === 1) {
    return `M ${points[0].x},${points[0].y}`;
  }

  return simplifySvgPath(points, {
    closed: false,
    tolerance,
    precision,
  });
}
