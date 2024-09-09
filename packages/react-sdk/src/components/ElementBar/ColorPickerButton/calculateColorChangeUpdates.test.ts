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
import { describe, expect, it } from 'vitest';
import {
  mockEllipseElement,
  mockLineElement,
  mockTextElement,
} from '../../../lib/testUtils/documentTestUtils';
import { calculateColorChangeUpdates } from './calculateColorChangeUpdates';

describe('calculateColorChangeUpdates', () => {
  const textElement = mockTextElement();
  const shapeElement = mockEllipseElement();
  const pathElement = mockLineElement();

  it('should update all elements', () => {
    expect(
      calculateColorChangeUpdates(
        { textElement, shapeElement, pathElement },
        red[500],
      ),
    ).toEqual([
      { elementId: 'textElement', patch: { fillColor: red[500] } },
      { elementId: 'shapeElement', patch: { fillColor: red[500] } },
      { elementId: 'pathElement', patch: { strokeColor: red[500] } },
    ]);
  });
});
