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
    const element = mockBlockArrowElement({
      position: { x: 10, y: 15 },
      width: 100,
      height: 50,
      fillColor: '#00ffff',
      text: 'My Text',
      textFontFamily: 'Inter',
      textSize: 12,
    });

    const view = getRenderProperties(element);

    expect(view).toEqual({
      strokeColor: '#00ffff',
      strokeWidth: 2,
      text: {
        position: { x: 20, y: 29.5 },
        width: 62.5,
        height: 21,
        alignment: 'center',
        bold: false,
        italic: false,
        fontFamily: 'Inter',
        fontSize: 12,
      },
      points: [
        { x: 10, y: 27.5 },
        { x: 75, y: 27.5 },
        { x: 75, y: 15 },
        { x: 110, y: 40 },
        { x: 75, y: 65 },
        { x: 75, y: 52.5 },
        { x: 10, y: 52.5 },
      ],
    });
  });

  it('should provide the properties for a block arrow element with custom text alignment', () => {
    const element = mockBlockArrowElement({
      position: { x: 10, y: 15 },
      width: 100,
      height: 50,
      fillColor: '#00ffff',
      text: 'My Text',
      textAlignment: 'right',
    });

    const view = getRenderProperties(element);

    expect(view).toEqual(
      expect.objectContaining({
        text: expect.objectContaining({
          alignment: 'right',
        }),
      }),
    );
  });

  it('should provide the properties for a block arrow element with bold text', () => {
    const element = mockBlockArrowElement({
      textBold: true,
    });

    const view = getRenderProperties(element);

    expect(view).toEqual(
      expect.objectContaining({
        text: expect.objectContaining({
          bold: true,
          italic: false,
        }),
      }),
    );
  });

  it('should provide the properties for a block arrow element with italic text', () => {
    const element = mockBlockArrowElement({
      textItalic: true,
    });

    const view = getRenderProperties(element);

    expect(view).toEqual(
      expect.objectContaining({
        text: expect.objectContaining({
          italic: true,
          bold: false,
        }),
      }),
    );
  });
});
