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

import { svgPathBbox } from 'svg-path-bbox';
import svgpath from 'svgpath';

function parseValidate(d: string) {
  const path = svgpath(d);

  // svgpath's typings don't declare err when it exists.
  // if parsing errors happen the library will just return a truncated or corrupted path silently
  const error = (path as unknown as { err?: string }).err;
  if (error) {
    throw error;
  }

  return path;
}

/**
 * Parses an SVG `<path d="...">` string and returns a new `d` string with
 * every coordinate scaled by the given factors around the origin (0,0).
 */
export function scalePathD(
  d: string,
  scaleX: number,
  scaleY: number,
  precision: number = 5,
): string {
  return parseValidate(d).scale(scaleX, scaleY).round(precision).toString();
}

/**
 * Calculates the exact bounding box of an SVG path `d` string
 */
export function calculateBoundsForPathD(d: string): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  // svgPathBbox itself never throws and never reports any errors, rely on svgpath
  // lib returns Infinity for empty path, change to 0s
  const [minX, minY, maxX, maxY] =
    d !== '' ? svgPathBbox(parseValidate(d)) : [0, 0, 0, 0];

  return {
    minX,
    minY,
    maxX,
    maxY,
  };
}
