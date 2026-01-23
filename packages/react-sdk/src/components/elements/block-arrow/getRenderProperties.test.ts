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
    });

    const view = getRenderProperties(element);

    expect(view.strokeColor).toBe('#00ffff');
    expect(view.strokeWidth).toBe(2);

    // Assert text exists before checking properties
    expect(view.text).toBeDefined();
    expect(view.text!.position).toEqual({ x: 20, y: 27.5 });
    expect(view.text!.width).toBe(75);
    expect(view.text!.height).toBe(25);
    expect(view.text!.alignment).toBe('center');
    expect(view.text!.bold).toBe(false);
    expect(view.text!.italic).toBe(false);
    expect(view.text!.fontFamily).toBe('Inter');
    expect(view.points).toEqual([
      { x: 10, y: 27.5 },
      { x: 75, y: 27.5 },
      { x: 75, y: 15 },
      { x: 110, y: 40 },
      { x: 75, y: 65 },
      { x: 75, y: 52.5 },
      { x: 10, y: 52.5 },
      { x: 10, y: 27.5 },
    ]);
  });

  it('should respect custom text alignment', () => {
    const element = mockBlockArrowElement({
      position: { x: 10, y: 15 },
      width: 100,
      height: 50,
      fillColor: '#00ffff',
      text: 'My Text',
      textAlignment: 'right',
    });

    const view = getRenderProperties(element);

    expect(view.text).toBeDefined();
    expect(view.text!.alignment).toBe('right');
  });

  it('should support bold text', () => {
    const element = mockBlockArrowElement({
      textBold: true,
    });

    const view = getRenderProperties(element);

    expect(view.text).toBeDefined();
    expect(view.text!.bold).toBe(true);
    expect(view.text!.italic).toBe(false);
  });

  it('should support italic text', () => {
    const element = mockBlockArrowElement({
      textItalic: true,
    });

    const view = getRenderProperties(element);

    expect(view.text).toBeDefined();
    expect(view.text!.italic).toBe(true);
    expect(view.text!.bold).toBe(false);
  });

  it('should respect explicit stroke values', () => {
    const element = mockBlockArrowElement({
      strokeColor: '#ff0000',
      strokeWidth: 1,
      text: '',
    });

    const view = getRenderProperties(element);

    expect(view.strokeColor).toBe('#ff0000');
    expect(view.strokeWidth).toBe(1);

    expect(view.text).toBeDefined();
    expect(view.text!.alignment).toBe('center');
    expect(view.text!.bold).toBe(false);
    expect(view.text!.italic).toBe(false);
  });
});
