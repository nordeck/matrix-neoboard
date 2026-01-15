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
import { getRenderProperties } from './getRenderProperties';

describe('getRenderProperties', () => {
  it('should provide the properties for a block arrow element', () => {
    const view = getRenderProperties(
      mockBlockArrowElement({
        position: { x: 10, y: 15 },
        width: 100,
        height: 50,
        fillColor: '#00ffff',
        text: 'My Text',
      }),
    );

    expect(view).toEqual({
      strokeColor: '#00ffff',
      strokeWidth: 2,

      text: {
        position: { x: 20, y: 25 },
        fontFamily: 'Inter',
        width: 80,
        height: 30,
        alignment: 'center',
        bold: false,
        italic: false,
      },
    });
  });

  it('should provide the properties for a block arrow element with custom text alignment', () => {
    const view = getRenderProperties(
      mockBlockArrowElement({
        position: { x: 10, y: 15 },
        width: 100,
        height: 50,
        fillColor: '#00ffff',
        text: 'My Text',
        textAlignment: 'right',
      }),
    );

    expect(view).toEqual({
      strokeColor: '#00ffff',
      strokeWidth: 2,

      text: {
        position: { x: 20, y: 25 },
        fontFamily: 'Inter',
        width: 80,
        height: 30,
        alignment: 'right',
        bold: false,
        italic: false,
      },
    });
  });

  it('should provide the properties for a block arrow element with bold text', () => {
    const view = getRenderProperties(
      mockBlockArrowElement({
        textBold: true,
      }),
    );

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
    });
  });

  it('should provide the properties for a block arrow element with italic text', () => {
    const view = getRenderProperties(
      mockBlockArrowElement({
        textItalic: true,
      }),
    );

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
    });
  });

  it('should provide the properties for a block arrow with stroke values', () => {
    const view = getRenderProperties(
      mockBlockArrowElement({
        strokeColor: '#ff0000',
        strokeWidth: 1,
        text: '',
      }),
    );

    expect(view).toEqual({
      strokeColor: '#ff0000',
      strokeWidth: 1,

      text: {
        position: { x: expect.any(Number), y: expect.any(Number) },
        fontFamily: 'Inter',
        width: expect.any(Number),
        height: expect.any(Number),
        alignment: 'center',
        bold: false,
        italic: false,
      },
    });
  });
});
