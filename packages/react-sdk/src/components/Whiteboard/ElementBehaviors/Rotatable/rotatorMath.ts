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

import { clamp } from 'lodash';
import { Element, Elements, Point } from '../../../../state';
import { isRotateableElement } from '../../../../state/crdt/documents/elements';

export function hasRotatedElements(elements: Elements): boolean {
  return Object.entries(elements)
    .map(([_, element]) => !!(isRotateableElement(element) && element.rotation))
    .includes(true);
}

export function checkMultiselect(elements: Elements): boolean {
  return Object.entries(elements).length > 1;
}

export function rotateCursor(cursor: string, angle: number): string {
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
  const nangle = clampAngle(angle);
  const times = Math.round(nangle / 45);
  const idx = cursors.findIndex((s) => cursor === s);
  if (idx === -1) return cursor;
  const res = cursors[(idx + times) % 8];
  return res;
}

export function calculateBoundaryWithRotationHandleForElements(
  elements: Element[],
  scale: number,
): {
  min: Point;
  max: Point;
  width: number;
  height: number;
} | null {
  // at this time will only work for an array with a single rotateable element
  if (elements.length !== 1) return null;
  if (!isRotateableElement(elements[0])) return null;
  return calculateBoundaryWithRotationHandle(elements[0], scale);
}

export function getMinMaxFromPoints(
  points: Point[],
  rotation: number,
  center: Point,
): { min: Point; max: Point; width: number; height: number } {
  const rotated = rotation
    ? points.map((p) => rotatePoint(p, center, rotation))
    : points;

  const maxX = rotated
    .map((o) => o.x)
    .reduce((prev, cur) => (cur >= prev ? cur : prev));
  const minX = rotated
    .map((o) => o.x)
    .reduce((prev, cur) => (cur <= prev ? cur : prev));
  const maxY = rotated
    .map((o) => o.y)
    .reduce((prev, cur) => (cur >= prev ? cur : prev));
  const minY = rotated
    .map((o) => o.y)
    .reduce((prev, cur) => (cur <= prev ? cur : prev));

  return {
    min: { x: minX, y: minY },
    max: { x: maxX, y: maxY },
    width: Math.abs(maxX - minX),
    height: Math.abs(maxY - minY),
  };
}

export function calculateBoundaryWithRotationHandle(
  element: Element,
  scale: number,
): {
  min: Point;
  max: Point;
  width: number;
  height: number;
} {
  if (!isRotateableElement(element)) {
    throw Error(`Element can't be rotated and can't have a rotation handle`);
  }

  // element has rotation
  const x = element.position.x;
  const y = element.position.y;
  const width = element.width;
  const height = element.height;

  const handle = calculateRotatorHandleCenter({
    containerHeight: element.height,
    containerWidth: element.width,
    scale,
  });

  // bunch of points at the boundaries
  const points: Point[] = [
    { x: x, y: y },
    { x: x + width, y: y },
    { x: x, y: y + height },
    { x: x + width, y: y + height },
    {
      x: x + handle.center.x,
      y: y + handle.center.y,
    },
  ];

  const center = {
    x: x + width / 2,
    y: y + height / 2,
  };

  return getMinMaxFromPoints(points, element.rotation ?? 0, center);
}

export function calculateRotatorHandleCenter(params: {
  containerWidth: number;
  containerHeight: number;
  scale: number;
}): {
  center: Point;
  width: number;
  height: number;
} {
  const { scale, containerHeight } = params;
  const padding = 2 * (10 / scale);
  const handleWidth = 16 / scale;
  const selectionBorderPadding = 2 / scale;

  const x = -handleWidth / 2 - selectionBorderPadding - padding;
  const y =
    containerHeight - handleWidth / 2 + selectionBorderPadding + padding;

  return {
    center: { x, y },
    width: handleWidth,
    height: handleWidth,
  };
}

export function rotatePoint(p: Point, center: Point, angle: number): Point {
  if (angle === 0) return { ...p };
  const rad = angle * (Math.PI / 180);
  const at = { x: p.x - center.x, y: p.y - center.y };
  const rotX = at.x * Math.cos(rad) - at.y * Math.sin(rad);
  const rotY = at.x * Math.sin(rad) + at.y * Math.cos(rad);
  return {
    x: rotX + center.x,
    y: rotY + center.y,
  };
}

// returns degrees in the range of [-180..0..180]
// positive value means B was rotated from A clockwise around the CENTER point
export function angleBetweenPoints(a: Point, b: Point, center: Point): number {
  const at = { x: a.x - center.x, y: a.y - center.y };
  const bt = { x: b.x - center.x, y: b.y - center.y };
  const dotProduct = at.x * bt.x + at.y * bt.y;
  const lena = Math.sqrt(at.x * at.x + at.y * at.y);
  const lenb = Math.sqrt(bt.x * bt.x + bt.y * bt.y);
  if (lena === 0) return 0;
  if (lenb === 0) return 0;
  // clamp cos to [-1,1], it's possible that rawCos may slightly go out of acos bounds
  const rawCos = dotProduct / (lena * lenb);
  const cos = clamp(rawCos, -1, 1);
  // vector cross product to detect forward and backward rotations
  const direction = Math.sign(at.x * bt.y - at.y * bt.x);
  const deg = (direction * Math.acos(cos) * 180.0) / Math.PI;
  return deg;
}

// makes 0..360 angle
export function clampAngle(angle: number): number {
  return ((Math.floor(angle) % 360) + 360) % 360;
}

export function getRotationTransformForElementsArrayWithCenterOffset(
  elements: Element[],
  offset: Point,
): {
  rotationValue?: number;
  rotationTransform: string;
} {
  if (elements.length === 1 && isRotateableElement(elements[0])) {
    const element = elements[0];
    const { x, y } = offset;
    const center = {
      x: x + element.width / 2,
      y: y + element.height / 2,
    };
    const rot = element.rotation;

    return {
      rotationValue: rot,
      rotationTransform: rot
        ? `rotate(${element.rotation} ${center.x} ${center.y})`
        : '',
    };
  }
  return { rotationValue: undefined, rotationTransform: '' };
}

export function getRotationTransformForElementsArray(elements: Element[]): {
  rotationValue?: number;
  rotationTransform: string;
} {
  return getRotationTransformForElementsArrayWithCenterOffset(elements, {
    x: 0,
    y: 0,
  });
}
