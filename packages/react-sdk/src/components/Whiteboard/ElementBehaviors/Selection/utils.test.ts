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

import { expect, it } from 'vitest';
import { mockEllipseElement } from '../../../../lib/testUtils';
import { ShapeElement } from '../../../../state';
import { calculateBoundingRectForElementWithRotationHandle } from './utils';

it('should calculate the boundary rect for rotatable element including the rotation handle', () => {
  const element: ShapeElement = mockEllipseElement({
    rotation: 45,
  });
  const result = calculateBoundingRectForElementWithRotationHandle(element, 10);
  expect(result).toEqual({
    offsetX: expect.closeTo(-31.14),
    offsetY: expect.closeTo(-2.03),
    height: expect.closeTo(106.07),
    width: expect.closeTo(109.18),
  });
});
