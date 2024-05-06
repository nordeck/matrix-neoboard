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

import { red } from '@mui/material/colors';
import {
  mockEllipseElement,
  mockLineElement,
} from '../../../lib/testUtils/documentTestUtils';
import { calculateTextColorChangeUpdates } from './calculateTextColorChangeUpdates';

describe('calculateTextColorChangeUpdates', () => {
  const pathElement = mockLineElement();
  const shapeElementWithText = mockEllipseElement({
    text: 'test',
  });
  const shapeElementWithTextAndColor1 = mockEllipseElement({
    text: 'test',
    textColor: red[300],
  });
  const shapeElementWithTextAndColor2 = mockEllipseElement({
    text: 'test',
    textColor: red[500],
  });
  const shapeElementWithoutText = mockEllipseElement({});

  it('should generate patches for elements with a text and a different color', () => {
    expect(
      calculateTextColorChangeUpdates(
        {
          pathElement,
          shapeElementWithText,
          shapeElementWithoutText,
          shapeElementWithTextAndColor1,
          shapeElementWithTextAndColor2,
        },
        red[500],
      ),
    ).toEqual([
      {
        elementId: 'shapeElementWithText',
        patch: { textColor: red[500] },
      },
      {
        elementId: 'shapeElementWithTextAndColor1',
        patch: { textColor: red[500] },
      },
    ]);
  });

  it('should not generate patches for empty elements', () => {
    expect(calculateTextColorChangeUpdates({}, red[500])).toEqual([]);
  });
});
