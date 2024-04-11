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

import {
  mockEllipseElement,
  mockLineElement,
} from '../../../lib/testUtils/documentTestUtils';
import { calculateTextItalicUpdates } from './calculateTextItalicUpdates';

describe('calculateTextItalicUpdates', () => {
  const element0 = mockLineElement();
  const element1 = mockEllipseElement();
  const element2 = mockEllipseElement();

  it('should return an empty list for empty elements', () => {
    expect(calculateTextItalicUpdates({}, true)).toEqual([]);
  });

  it('should return updates only for shape elements', () => {
    expect(
      calculateTextItalicUpdates({ element0, element1, element2 }, true),
    ).toEqual([
      { elementId: 'element1', patch: { textItalic: true } },
      { elementId: 'element2', patch: { textItalic: true } },
    ]);
  });

  it('should return updates only if there are changes', () => {
    expect(
      calculateTextItalicUpdates(
        {
          element0,
          element1: { ...element1, textItalic: true },
          element2: { ...element2, textItalic: true },
        },
        true,
      ),
    ).toEqual([]);
  });
});
