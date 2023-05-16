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

import { Element } from '../../../state';
import { duplicate } from './DuplicateActiveElementButton';

describe('duplicate', () => {
  it('should duplicate a points element', async () => {
    const element: Element = {
      type: 'path',
      kind: 'line',
      position: { x: 10, y: 20 },
      points: [
        { x: 0, y: 0 },
        { x: 80, y: 70 },
      ],
      strokeColor: '#ff0000',
    };

    expect(duplicate(element, 40)).toEqual({
      ...element,
      // 10 is x, 80 is the width and 40 is the grid cell size
      position: { x: 10 + 80 + 40, y: 20 },
    });
  });

  it('should duplicate a shape element', async () => {
    const element: Element = {
      type: 'shape',
      kind: 'rectangle',
      position: { x: 10, y: 20 },
      width: 80,
      height: 70,
      fillColor: '#000',
      text: '',
    };

    expect(duplicate(element, 40)).toEqual({
      ...element,
      // 10 is x, 80 is the width and 40 is the grid cell size
      position: { x: 10 + 80 + 40, y: 20 },
    });
  });

  it('should stop at the right edge when duplicating points elements', async () => {
    const element: Element = {
      type: 'path',
      kind: 'line',
      position: { x: 1920 - 120, y: 20 },
      points: [
        { x: 0, y: 0 },
        { x: 80, y: 70 },
      ],
      strokeColor: '#ff0000',
    };

    expect(duplicate(element, 40)).toEqual({
      ...element,
      // 80 is the width
      position: { x: 1920 - 80, y: 20 },
    });
  });

  it('should stop at the right edge when duplicating shape elements', async () => {
    const element: Element = {
      type: 'shape',
      kind: 'rectangle',
      position: { x: 1920 - 120, y: 20 },
      width: 80,
      height: 70,
      fillColor: '#000',
      text: '',
    };

    expect(duplicate(element, 40)).toEqual({
      ...element,
      // 80 is the width
      position: { x: 1920 - 80, y: 20 },
    });
  });

  it('should stay put if already at the right edge when duplicating a points element', async () => {
    const element: Element = {
      type: 'path',
      kind: 'line',
      position: { x: 1920 - 80, y: 20 },
      points: [
        { x: 0, y: 0 },
        { x: 80, y: 70 },
      ],
      strokeColor: '#ff0000',
    };

    expect(duplicate(element, 40)).toEqual({
      ...element,
      // 80 is the width
      position: { x: 1920 - 80, y: 20 },
    });
  });

  it('should stay put if already at the right edge when duplicating a shape element', async () => {
    const element: Element = {
      type: 'shape',
      kind: 'rectangle',
      position: { x: 1920 - 80, y: 20 },
      width: 80,
      height: 70,
      fillColor: '#000',
      text: '',
    };

    expect(duplicate(element, 40)).toEqual({
      ...element,
      // 80 is the width
      position: { x: 1920 - 80, y: 20 },
    });
  });
});
