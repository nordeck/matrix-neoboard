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
import { mockBlockArrowElement } from '../../../lib/testUtils';
import { getRenderProperties as getRenderBlockArrowProperties } from '../../elements/block-arrow/getRenderProperties';
import { createWhiteboardPdfElementShape } from './createWhiteboardPdfElementShape';

describe('rectangle', () => {
  it.todo('renders rectangle canvas element');
  it.todo('handles transparent fill correctly');
  it.todo('renders text when provided');
});

describe('ellipse / circle', () => {
  it.todo('renders ellipse for circle kind');
  it.todo('renders ellipse for ellipse kind');
});

describe('triangle', () => {
  it.todo('renders closed polyline triangle');
});

describe('createWhiteboardPdfElementShape', () => {
  it('should use render points for block-arrow shapes', () => {
    const element = mockBlockArrowElement({
      position: { x: 10, y: 15 },
      width: 100,
      height: 50,
      fillColor: '#00ffff',
      strokeColor: '#ff0000',
      strokeWidth: 3,
      text: '',
    });

    const { points } = getRenderBlockArrowProperties(element);
    const isClosed =
      points.length > 1 &&
      points[0]?.x === points[points.length - 1]?.x &&
      points[0]?.y === points[points.length - 1]?.y;
    const pdfPoints = isClosed ? points.slice(0, -1) : points;

    const result = createWhiteboardPdfElementShape(element);

    expect(result).toEqual([
      {
        canvas: [
          {
            type: 'polyline',
            points: pdfPoints,
            closePath: true,
            color: '#00ffff',
            lineWidth: 3,
            lineColor: '#ff0000',
            strokeOpacity: 1,
          },
        ],
        unbreakable: true,
        absolutePosition: { x: 0, y: 0 },
      },
      [],
    ]);
  });
});
