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

import paper from 'paper';
import { Point } from '../state';

function vectorAdd(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

export type PathSegment = {
  point: Point;
  handleIn: Point;
  handleOut: Point;
};

/**
 * Renders curve `segments`  into a
 * string usable directly as an SVG `<path d="...">` attribute.
 *
 * @param precision Optional number of decimal places to round coordinates
 *   to (trailing zeros are stripped). Omit for full floating-point
 *   precision; pass e.g. `2` to keep the output compact.
 */
export function segmentsToSvgPath(
  segments: readonly PathSegment[],
  precision?: number,
): string {
  if (segments.length === 0) {
    return '';
  }

  const format = (n: number): string =>
    precision === undefined ? String(n) : String(Number(n.toFixed(precision)));
  const formatPoint = (p: Point): string => `${format(p.x)},${format(p.y)}`;

  const first = segments[0];
  let d = `M ${formatPoint(first.point)}`;

  for (let i = 1; i < segments.length; i++) {
    const start = segments[i - 1];
    const end = segments[i];
    const cp1 = vectorAdd(start.point, start.handleOut);
    const cp2 = vectorAdd(end.point, end.handleIn);
    d += ` C ${formatPoint(cp1)} ${formatPoint(cp2)} ${formatPoint(end.point)}`;
  }

  return d;
}

/**
 * Simplifies a raw polyline into a smooth SVG path using paper.js's own
 * `Path#simplify`. Returns bezier curve segments.
 */
export function simplifyPathPaperSegments(
  points: Point[],
  tolerance: number = 10,
): PathSegment[] {
  // paper.js keeps per-scope state on a module-level `paper` global that
  // `activate()` overwrites; save the previously active scope so it can be
  // restored once this scratch scope is disposed.
  const previousScope = paper;
  const scratchScope = new paper.PaperScope();

  try {
    scratchScope.activate();
    scratchScope.setup(new scratchScope.Size(1, 1)); // virtual canvas, never rendered
    scratchScope.view.autoUpdate = false; // no automatic drawing

    const path = new scratchScope.Path({
      segments: points.map((p) => new scratchScope.Point(p.x, p.y)),
    });

    path.simplify(tolerance);

    const segments: PathSegment[] = path.segments.map(
      (segment: paper.Segment) => {
        //paper.Segment is a complex object with many private fields, return a simplified version
        const toPlainPoint = (p: Point) => ({ x: p.x, y: p.y });
        return {
          point: toPlainPoint(segment.point),
          handleIn: toPlainPoint(segment.handleIn),
          handleOut: toPlainPoint(segment.handleOut),
        };
      },
    );

    return segments;
  } finally {
    // paper library cleanup
    // scratchScope.remove() function exists, but not present in the type defs
    (scratchScope as unknown as { remove(): void }).remove();
    previousScope.activate();
  }
}
