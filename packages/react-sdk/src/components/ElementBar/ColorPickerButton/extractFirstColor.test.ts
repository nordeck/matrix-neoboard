/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

import { green, red } from '@mui/material/colors';
import { describe, expect, it } from 'vitest';
import {
  mockEllipseElement,
  mockLineElement,
  mockTextElement,
} from '../../../lib/testUtils/documentTestUtils';
import { extractFirstColor } from './extractFirstColor';

describe('extractFirstNonTransparentColorOrFirst', () => {
  const textElement1 = mockTextElement();
  const textElement2 = mockTextElement();
  const shapeElement = mockEllipseElement({
    fillColor: red[500],
  });
  const pathElement = mockLineElement({
    strokeColor: green[500],
  });

  it('should return undefined if there are no elements', () => {
    expect(extractFirstColor([])).toBeUndefined();
  });

  it('should return "transparent" if there are only text elements', () => {
    expect(extractFirstColor([textElement1, textElement2])).toBe('transparent');
  });

  it('should return the color of the first element (shape element)', () => {
    expect(extractFirstColor([shapeElement, textElement1, pathElement])).toBe(
      red[500],
    );
  });

  it('should return the color of the first element (text element)', () => {
    expect(extractFirstColor([textElement1, shapeElement, pathElement])).toBe(
      'transparent',
    );
  });

  it('should return the color of the first element (path element)', () => {
    expect(extractFirstColor([pathElement, textElement1, shapeElement])).toBe(
      green[500],
    );
  });
});
