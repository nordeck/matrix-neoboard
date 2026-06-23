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

import { describe, expect, it } from 'vitest';
import {
  mockLineElement,
  mockRectangleElement,
} from '../../../../lib/testUtils';
import { RotateHandleDragEvent } from './RotateHandle';
import { rotateConnectedPaths } from './utils';

describe('Rotatable utils', () => {
  it('should rotate connected paths', () => {
    const rectangleElement = mockRectangleElement({
      rotation: 30,
      connectedPaths: ['line'],
    });
    const lineElement = mockLineElement({
      connectedElementStart: 'rectangle',
      points: [
        { x: 0, y: 0 },
        { x: 20, y: 20 },
      ],
      position: { x: 30, y: 30 },
    });

    const elements = {
      rectangle: rectangleElement,
    };
    const event: RotateHandleDragEvent = {
      newAngle: 29,
      referenceAngle: 30,
      angleSnap: false,
    };

    const connectingPathElements = {
      line: lineElement,
    };
    const updates = rotateConnectedPaths(
      event,
      connectingPathElements,
      elements,
    );
    expect(updates).toEqual([
      {
        elementId: 'line',
        elementOverride: {
          points: [
            { x: 0, y: 0 },
            { x: expect.closeTo(20.37), y: expect.closeTo(20.08) },
          ],
          position: { x: expect.closeTo(29.63), y: expect.closeTo(29.92) },
        },
      },
    ]);
  });
});
