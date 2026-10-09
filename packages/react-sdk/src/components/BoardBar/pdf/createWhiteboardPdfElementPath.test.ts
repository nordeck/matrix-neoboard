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
import {
  mockCurveElement,
  mockLineElement,
  mockPolylineElement,
} from '../../../lib/testUtils';
import { createWhiteboardPdfElementPath } from './createWhiteboardPdfElementPath';

describe('createWhiteboardPdfElementPath', () => {
  it('should create canvas content for a line', () => {
    const element = mockLineElement();

    expect(createWhiteboardPdfElementPath(element)).toEqual({
      canvas: [
        {
          type: 'line',
          x1: 0,
          y1: 2,
          x2: 2,
          y2: 4,
          lineWidth: 4,
          lineColor: '#ffffff',
        },
      ],
      unbreakable: true,
      absolutePosition: { x: 0, y: 0 },
    });
  });

  it('should create canvas content for a polyline', () => {
    const element = mockPolylineElement();

    expect(createWhiteboardPdfElementPath(element)).toEqual({
      canvas: [
        {
          type: 'polyline',
          points: [
            { x: 0, y: 2 },
            { x: 2, y: 4 },
            { x: 4, y: 6 },
          ],
          lineWidth: 4,
          lineColor: '#ffffff',
          lineCap: 'round',
          lineJoin: 'round',
        },
      ],
      unbreakable: true,
      absolutePosition: { x: 0, y: 0 },
    });
  });

  it('should create svg content for a curve', () => {
    const element = mockCurveElement();

    // points [{0,0},{4,6}] give a bounding box of width 4, height 6; padded
    // by the stroke width (4) on every side so the stroke isn't clipped at
    // the curve's tight bounding box.
    expect(createWhiteboardPdfElementPath(element)).toEqual({
      svg:
        '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="14" viewBox="-4 -4 12 14">' +
        '<path d="M0,0 C2,4 4,6 4,6" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="#ffffff" stroke-width="4" />' +
        '</svg>',
      width: 12,
      height: 14,
      absolutePosition: { x: -4, y: -3 },
    });
  });
});
