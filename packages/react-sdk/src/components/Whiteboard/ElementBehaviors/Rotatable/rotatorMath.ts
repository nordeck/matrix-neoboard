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

import { Element, Point } from '../../../../state';
import { isRotateableElement } from '../../../../state/crdt/documents/elements';

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

export function calculateBoundaryWithRotationHandle(
  element: Element,
  scale: number,
) {
  if (!isRotateableElement(element)) throw Error('not ratateable');

  // element has rotation
  const x = element?.position.x ?? 0;
  const y = element?.position.y ?? 0;
  const width = element?.width ?? 0;
  const height = element?.height ?? 0;

  const handle = calculateRotatorHandleCenter({
    containerHeight: element.height,
    containerWidth: element.width,
    scale,
  });

  const points: Point[] = [
    { x: x, y: y },
    { x: x + width, y: y },
    { x: x, y: y + height },
    { x: x + width, y: y + height },
    {
      x: x + handle.center.x - handle.width,
      y: y + handle.center.y + handle.height,
    },
  ];
  const center = {
    x: x + width / 2,
    y: y + height / 2,
  };

  const rotated = points.map((p) =>
    rotatePoint(p, center, element.rotation ?? 0),
  );

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
  const cos = dotProduct / (lena * lenb);
  // vector cross product to detect forward and backward rotations
  const direction = Math.sign(at.x * bt.y - at.y * bt.x);
  const deg = (direction * Math.acos(cos) * 180.0) / Math.PI;
  return deg;
}

// makes 0..360 angle
export function clampAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}
