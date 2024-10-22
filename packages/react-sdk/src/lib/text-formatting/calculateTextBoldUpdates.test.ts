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

import { describe, expect, it } from 'vitest';
import {
  mockCircleElement,
  mockLineElement,
  mockRectangleElement,
} from '../testUtils/documentTestUtils';
import { calculateTextBoldUpdates } from './calculateTextBoldUpdates';

describe('calculateTextBoldUpdates', () => {
  const rectangle = mockRectangleElement();
  const circle = mockCircleElement();
  const line = mockLineElement();

  it('should return an empty list for empty elements', () => {
    expect(calculateTextBoldUpdates({}, true)).toEqual([]);
  });

  it('should return updates only for shape elements', () => {
    expect(calculateTextBoldUpdates({ rectangle, circle, line }, true)).toEqual(
      [
        { elementId: 'rectangle', patch: { textBold: true } },
        { elementId: 'circle', patch: { textBold: true } },
      ],
    );
  });

  it('should return updates only if there are changes', () => {
    expect(
      calculateTextBoldUpdates(
        {
          rectangle: { ...rectangle, textBold: true },
          circle: { ...circle, textBold: true },
          line,
        },
        true,
      ),
    ).toEqual([]);
  });
});
