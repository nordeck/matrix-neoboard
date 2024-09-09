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
import { mockEllipseElement } from '../../../../lib/testUtils/documentTestUtils';
import { calculateIntersect } from './calculateIntersect';

const selection = mockEllipseElement({
  position: { x: 50, y: 50 },
  width: 50,
  height: 50,
});

const leftOfSelection = mockEllipseElement({
  position: { x: 0, y: 0 },
  width: 49,
  height: 49,
});
const rightOfSelection = mockEllipseElement({
  position: { x: 101, y: 50 },
  width: 50,
  height: 50,
});
const aboveSelection = mockEllipseElement({
  position: { x: 50, y: 0 },
  width: 49,
  height: 49,
});
const belowSelection = mockEllipseElement({
  position: { x: 50, y: 101 },
  width: 50,
  height: 50,
});
const intersecting1 = mockEllipseElement({
  position: { x: 25, y: 25 },
  width: 50,
  height: 50,
});
const intersecting2 = mockEllipseElement({
  position: { x: 0, y: 70 },
  width: 150,
  height: 20,
});
const elements = {
  leftOfSelection,
  rightOfSelection,
  aboveSelection,
  belowSelection,
  intersecting1,
  intersecting2,
};

describe('calculateIntersect', () => {
  it('should find only intersecting elements', () => {
    expect(calculateIntersect(selection, elements)).toEqual([
      'intersecting1',
      'intersecting2',
    ]);
  });
});
