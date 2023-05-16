/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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

import Joi from 'joi';

export type Point = { x: number; y: number };

export const pointSchema = Joi.object<Point, true>({
  x: Joi.number().strict().required(),
  y: Joi.number().strict().required(),
}).unknown();

export function calculateBoundingRectForPoints(points: Point[]): {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
} {
  let minX = +(points[0]?.x ?? 0);
  let minY = +(points[0]?.y ?? 0);
  let maxX = +(points[0]?.x ?? 0);
  let maxY = +(points[0]?.y ?? 0);

  for (let i = 1; i < points.length; ++i) {
    const p = points[i];
    minX = Math.min(minX, +p.x);
    minY = Math.min(minY, +p.y);
    maxX = Math.max(maxX, +p.x);
    maxY = Math.max(maxY, +p.y);
  }

  return {
    offsetX: minX,
    offsetY: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}
