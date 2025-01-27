/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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
  mockCircleElement,
  mockLineElement,
  mockRectangleElement,
} from '../testUtils/documentTestUtils';
import { calculateFontFamilyUpdates } from './calculateFontFamilyUpdates';

describe('calculateFontFamilyUpdates', () => {
  const rectangle = mockRectangleElement();
  const circle = mockCircleElement();
  const line = mockLineElement();

  it('should return an empty list for empty elements', () => {
    expect(calculateFontFamilyUpdates({}, 'inter')).toEqual([]);
  });

  it('should return updates only for shape elements', () => {
    expect(
      calculateFontFamilyUpdates({ rectangle, circle, line }, 'Abel'),
    ).toEqual([
      { elementId: 'rectangle', patch: { textFontFamily: 'Abel' } },
      { elementId: 'circle', patch: { textFontFamily: 'Abel' } },
    ]);
  });

  it('should return updates only if there are changes in font family', () => {
    expect(
      calculateFontFamilyUpdates(
        {
          rectangle: { ...rectangle, textFontFamily: 'inter' },
          circle: { ...circle, textFontFamily: 'inter' },
          line,
        },
        'Chewy',
      ),
    ).toEqual([
      { elementId: 'rectangle', patch: { textFontFamily: 'Chewy' } },
      { elementId: 'circle', patch: { textFontFamily: 'Chewy' } },
    ]);
  });

  it('should not return updates if the font family is the same as the current one', () => {
    expect(
      calculateFontFamilyUpdates(
        {
          rectangle: { ...rectangle, textFontFamily: 'inter' },
          circle: { ...circle, textFontFamily: 'inter' },
          line,
        },
        'inter',
      ),
    ).toEqual([]);
  });
});
