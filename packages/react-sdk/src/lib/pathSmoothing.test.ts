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
import { simplifyPointsToD } from './pathSmoothing';

// Sample 5 points along a single sine hump (half a period), which a
// cubic bezier curve can approximate with only 2 segments.
function createSinePoints(): Point[] {
  return Array.from({ length: 5 }, (_, i) => {
    const angle = (i / 4) * Math.PI;
    return { x: angle * 20, y: Math.sin(angle) * 20 };
  });
}

describe('simplifyPathPaperSegments', () => {
  it('should produce a SVG d path definition', () => {
    const points = createSinePoints();
    const d = simplifyPointsToD(points);
    expect(d).toBe(
      'M0,0c5.23599,4.71405 9.76471,10.35854 15.70796,14.14214c20.34769,12.95374 32.39891,-0.88499 47.12389,-14.14214',
    );
  });

  it('should produce a SVG d path definition with precision 2', () => {
    const points = createSinePoints();
    const d = simplifyPointsToD(points, 2.5, 2);
    expect(d).toBe(
      'M0,0c5.24,4.71 9.76,10.36 15.71,14.14c20.35,12.95 32.4,-0.88 47.12,-14.14',
    );
  });

  it('should produce a move-only path definition for a single segment', () => {
    const d = simplifyPointsToD([{ x: 5, y: 5 }]);

    expect(d).toBe('M 5,5');
  });

  it('should return an empty string for no segments', () => {
    const d = simplifyPointsToD([]);

    expect(d).toBe('');
  });
});
