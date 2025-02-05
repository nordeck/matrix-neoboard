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

import { describe, expect, it } from 'vitest';
import { mockTriangleElement } from '../../../lib/testUtils/documentTestUtils';
import { getRenderProperties } from './getRenderProperties';

describe('getRenderProperties', () => {
  it('should provide the properties for a triangle element', () => {
    const view = getRenderProperties({
      type: 'shape',
      kind: 'triangle',
      position: { x: 10, y: 15 },
      fillColor: '#00ffff',
      textFontFamily: 'Inter',
      width: 100,
      height: 50,
      text: 'My Text',
    });

    expect(view).toEqual({
      strokeColor: '#00ffff',
      strokeWidth: 2,

      text: {
        position: { x: expect.any(Number), y: expect.any(Number) },
        fontFamily: 'Inter',
        width: expect.any(Number),
        height: expect.any(Number),
        alignment: 'center',
        bold: false,
        italic: false,
      },

      points: {
        p0X: 10,
        p0Y: 65,
        p1X: 60,
        p1Y: 15,
        p2X: 110,
        p2Y: 65,
      },
    });

    expect(view.text?.position.x).toBeCloseTo(43.33, 1);
    expect(view.text?.position.y).toBeCloseTo(31.66, 1);
    expect(view.text?.width).toBeCloseTo(33.33, 1);
    expect(view.text?.height).toBeCloseTo(23.33, 1);
  });

  it('should provide the properties for a triangle element with zero width and height', () => {
    const view = getRenderProperties(
      mockTriangleElement({ width: 0, height: 0 }),
    );

    expect(view).toEqual({
      strokeColor: '#ffffff',
      strokeWidth: 2,

      text: {
        position: { x: 0, y: 1 },
        fontFamily: 'Inter',
        width: 0,
        height: 0,
        alignment: 'center',
        bold: false,
        italic: false,
      },

      points: {
        p0X: 0,
        p0Y: 1,
        p1X: 0,
        p1Y: 1,
        p2X: 0,
        p2Y: 1,
      },
    });
  });

  it('should provide the properties for a triangle element with custom text alignment', () => {
    const view = getRenderProperties({
      type: 'shape',
      kind: 'triangle',
      position: { x: 10, y: 15 },
      fillColor: '#00ffff',
      textFontFamily: 'Inter',
      width: 100,
      height: 50,
      text: 'My Text',
      textAlignment: 'right',
    });

    expect(view).toEqual({
      strokeColor: '#00ffff',
      strokeWidth: 2,

      text: {
        position: { x: expect.any(Number), y: expect.any(Number) },
        fontFamily: 'Inter',
        width: expect.any(Number),
        height: expect.any(Number),
        alignment: 'right',
        bold: false,
        italic: false,
      },

      points: {
        p0X: 10,
        p0Y: 65,
        p1X: 60,
        p1Y: 15,
        p2X: 110,
        p2Y: 65,
      },
    });
  });

  it('should provide the properties for a triangle element with text bold', () => {
    const view = getRenderProperties(mockTriangleElement({ textBold: true }));

    expect(view).toEqual({
      strokeColor: '#ffffff',
      strokeWidth: 2,

      text: {
        position: { x: expect.any(Number), y: expect.any(Number) },
        fontFamily: 'Inter',
        width: expect.any(Number),
        height: expect.any(Number),
        alignment: 'center',
        bold: true,
        italic: false,
      },

      points: {
        p0X: 0,
        p0Y: 101,
        p1X: 25,
        p1Y: 1,
        p2X: 50,
        p2Y: 101,
      },
    });
  });

  it('should provide the properties for a triangle element with text italic', () => {
    const view = getRenderProperties(mockTriangleElement({ textItalic: true }));

    expect(view).toEqual({
      strokeColor: '#ffffff',
      strokeWidth: 2,

      text: {
        position: { x: expect.any(Number), y: expect.any(Number) },
        fontFamily: 'Inter',
        width: expect.any(Number),
        height: expect.any(Number),
        alignment: 'center',
        bold: false,
        italic: true,
      },

      points: {
        p0X: 0,
        p0Y: 101,
        p1X: 25,
        p1Y: 1,
        p2X: 50,
        p2Y: 101,
      },
    });
  });
});
