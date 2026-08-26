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

import { describe, expect, it } from 'vitest';
import { Point } from '../state';
import { segmentsToSvgPath, simplifyPathPaperSegments } from './pathSmoothing';

// Sample 5 points along a single sine hump (half a period), which a
// cubic bezier curve can approximate with only 2 segments.
function createSinePoints(): Point[] {
  return Array.from({ length: 5 }, (_, i) => {
    const angle = (i / 4) * Math.PI;
    return { x: angle * 20, y: Math.sin(angle) * 20 };
  });
}

describe('simplifyPathPaperSegments', () => {
  it('should reduce the number of segments when simplifying a smooth curve', () => {
    const points = createSinePoints();

    const segments = simplifyPathPaperSegments(points);

    expect(segments).toEqual([
      {
        point: { x: expect.closeTo(0, 2), y: expect.closeTo(0, 2) },
        handleIn: { x: expect.closeTo(0, 2), y: expect.closeTo(0, 2) },
        handleOut: {
          x: expect.closeTo(25.99, 2),
          y: expect.closeTo(23.4, 2),
        },
      },
      {
        point: { x: expect.closeTo(62.83, 2), y: expect.closeTo(0, 2) },
        handleIn: {
          x: expect.closeTo(-25.99, 2),
          y: expect.closeTo(23.4, 2),
        },
        handleOut: { x: expect.closeTo(0, 2), y: expect.closeTo(0, 2) },
      },
    ]);
  });

  it('should return a single segment with zero-length handles for a single point', () => {
    const segments = simplifyPathPaperSegments([{ x: 5, y: 5 }]);

    expect(segments).toEqual([
      {
        point: { x: 5, y: 5 },
        handleIn: { x: 0, y: 0 },
        handleOut: { x: 0, y: 0 },
      },
    ]);
  });

  it('should return no segments for an empty points array', () => {
    const segments = simplifyPathPaperSegments([]);

    expect(segments).toEqual([]);
  });

  it('should produce a SVG d path definition', () => {
    const points = createSinePoints();
    const segments = simplifyPathPaperSegments(points);
    const d = segmentsToSvgPath(segments);
    expect(d).toBe(
      'M 0,0 C 25.988199279851244,23.39759983919243 36.84365379194462,23.397599839192427 62.83185307179586,2.4492935982947065e-15',
    );
  });

  it('should produce a SVG d path definition with precision 2', () => {
    const points = createSinePoints();
    const segments = simplifyPathPaperSegments(points);
    const d = segmentsToSvgPath(segments, 2);
    expect(d).toBe('M 0,0 C 25.99,23.4 36.84,23.4 62.83,0');
  });

  it('should produce a move-only path definition for a single segment', () => {
    const d = segmentsToSvgPath([
      {
        point: { x: 5, y: 5 },
        handleIn: { x: 0, y: 0 },
        handleOut: { x: 0, y: 0 },
      },
    ]);

    expect(d).toBe('M 5,5');
  });

  it('should return an empty string for no segments', () => {
    const d = segmentsToSvgPath([]);

    expect(d).toBe('');
  });
});
