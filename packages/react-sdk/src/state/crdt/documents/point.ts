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
import { clamp } from 'lodash';

export type Point = { x: number; y: number };

export const pointSchema = Joi.object<Point, true>({
  x: Joi.number().strict().required(),
  y: Joi.number().strict().required(),
}).unknown();

export type BoundingRect = {
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
};

export function calculateBoundingRectForPoints(points: Point[]): BoundingRect {
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

export function isPointWithinBoundingRect(
  { x, y }: Point,
  { offsetX, offsetY, width, height }: BoundingRect,
): boolean {
  return (
    offsetX <= x &&
    x <= offsetX + width &&
    offsetY <= y &&
    y <= offsetY + height
  );
}

/**
 * Rotates point around the center to the specified angle
 */
export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const { x: pointX, y: pointY } = point;
  if (angle === 0) return { x: pointX, y: pointY };
  const { x: centerX, y: centerY } = center;
  const rad = angle * (Math.PI / 180);
  const x = pointX - centerX;
  const y = pointY - centerY;
  const cosRad = Math.cos(rad);
  const sinRad = Math.sin(rad);
  const rx = x * cosRad - y * sinRad;
  const ry = x * sinRad + y * cosRad;
  return {
    x: rx + centerX,
    y: ry + centerY,
  };
}

/**
 * Calculates angle between points around the center point.
 * Positive value means b was rotated from a clockwise around the center point.
 */
export function angleBetweenPoints(a: Point, b: Point, center: Point): number {
  const aX = a.x - center.x;
  const aY = a.y - center.y;
  const bX = b.x - center.x;
  const bY = b.y - center.y;
  const dotProduct = aX * bX + aY * bY;
  const lenA = Math.sqrt(aX * aX + aY * aY);
  const lenB = Math.sqrt(bX * bX + bY * bY);
  if (lenA === 0 || lenB === 0) return 0;
  // clamp cos to [-1,1], it's possible that rawCos may slightly go out of acos bounds
  const rawCos = dotProduct / (lenA * lenB);
  const cos = clamp(rawCos, -1, 1);
  // vector cross product to detect forward and backward rotations
  const direction = Math.sign(aX * bY - aY * bX);
  return (direction * Math.acos(cos) * 180.0) / Math.PI;
}
