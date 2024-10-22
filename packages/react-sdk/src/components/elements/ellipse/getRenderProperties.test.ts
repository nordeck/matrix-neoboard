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
import { mockEllipseElement } from '../../../lib/testUtils/documentTestUtils';
import { getRenderProperties } from './getRenderProperties';

describe('getRenderProperties', () => {
  it('should provide the properties for an ellipse element', () => {
    const view = getRenderProperties({
      type: 'shape',
      kind: 'ellipse',
      position: { x: 10, y: 15 },
      fillColor: '#00ffff',
      width: 100,
      height: 50,
      text: 'My Text',
    });

    expect(view).toEqual({
      strokeColor: '#00ffff',
      strokeWidth: 2,

      text: {
        position: { x: expect.any(Number), y: expect.any(Number) },
        width: expect.any(Number),
        height: expect.any(Number),
        alignment: 'center',
        bold: false,
        italic: false,
      },
    });

    expect(view.text?.position.x).toBeCloseTo(24.6, 1);
    expect(view.text?.position.y).toBeCloseTo(22.3, 1);
    expect(view.text?.width).toBeCloseTo(70.7, 1);
    expect(view.text?.height).toBeCloseTo(35.35, 1);
  });

  it('should provide the properties for an ellipse element with custom text alignment', () => {
    const view = getRenderProperties({
      type: 'shape',
      kind: 'ellipse',
      position: { x: 10, y: 15 },
      fillColor: '#00ffff',
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
        width: expect.any(Number),
        height: expect.any(Number),
        alignment: 'right',
        bold: false,
        italic: false,
      },
    });
  });

  it('should provide the properties for an ellipse element with text bold', () => {
    const shape = mockEllipseElement({ textBold: true });
    const view = getRenderProperties(shape);

    expect(view).toEqual({
      strokeColor: '#ffffff',
      strokeWidth: 2,

      text: {
        position: { x: expect.any(Number), y: expect.any(Number) },
        width: expect.any(Number),
        height: expect.any(Number),
        alignment: 'center',
        bold: true,
        italic: false,
      },
    });
  });

  it('should provide the properties for an ellipse element with text italic', () => {
    const shape = mockEllipseElement({ textItalic: true });
    const view = getRenderProperties(shape);

    expect(view).toEqual({
      strokeColor: '#ffffff',
      strokeWidth: 2,

      text: {
        position: { x: expect.any(Number), y: expect.any(Number) },
        width: expect.any(Number),
        height: expect.any(Number),
        alignment: 'center',
        bold: false,
        italic: true,
      },
    });
  });
});
