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
import {
  mockEllipseElement,
  mockLineElement,
  mockTextElement,
} from '../../../lib/testUtils/documentTestUtils';
import { extractFirstNonTransparentOrFirstColor } from './extractFirstNonTransparentOrFirstColor';

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
    expect(extractFirstNonTransparentOrFirstColor({})).toBeUndefined();
  });

  it('should return "transparent" if there are only text elements', () => {
    expect(
      extractFirstNonTransparentOrFirstColor({
        'text-1': textElement1,
        'text-2': textElement2,
      }),
    ).toBe('transparent');
  });

  it('should return the color of the first non-transparent element (shape element)', () => {
    expect(
      extractFirstNonTransparentOrFirstColor({
        'text-1': textElement1,
        shape: shapeElement,
        path: pathElement,
      }),
    ).toBe(red[500]);
  });

  it('should return the color of the first non-transparent element (path element)', () => {
    expect(
      extractFirstNonTransparentOrFirstColor({
        'text-1': textElement1,
        path: pathElement,
        shape: shapeElement,
      }),
    ).toBe(green[500]);
  });
});
