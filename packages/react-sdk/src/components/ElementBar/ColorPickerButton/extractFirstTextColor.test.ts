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
  mockImageElement,
  mockLineElement,
} from '../../../lib/testUtils/documentTestUtils';
import { extractFirstTextColor } from './extractFirstTextColor';

describe('extractFirstTextColor', () => {
  it('should return undefined for an empty list', () => {
    expect(extractFirstTextColor([])).toBeUndefined();
  });

  it('should return undefined if there is no element with a text prop', () => {
    expect(
      extractFirstTextColor([mockLineElement(), mockImageElement()]),
    ).toBeUndefined();
  });

  it('should return the first explicitly defined text color', () => {
    expect(
      extractFirstTextColor([
        // no text
        mockEllipseElement({ textColor: red[300] }),
        // explicit text color set
        mockEllipseElement({ text: 'test', textColor: red[500] }),
        // other element
        mockEllipseElement({ text: 'test', textColor: red[700] }),
      ]),
    ).toEqual(red[500]);
  });

  it('should return the first implicit text color', () => {
    expect(
      extractFirstTextColor([
        // no text
        mockEllipseElement({ textColor: red[300] }),
        // implicit text color
        mockEllipseElement({ text: 'test' }),
        // other element
        mockEllipseElement({ text: 'test', textColor: red[700] }),
      ]),
    ).toEqual('#000');
  });
});