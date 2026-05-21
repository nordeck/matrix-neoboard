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
  mockCircleElement,
  mockFrameElement,
  mockImageElement,
  mockLineElement,
} from '../../lib/testUtils';
import { Element } from '../../state';
import { mergeElementAndOverride } from './utils';

describe('ElementOverridesProvider util', () => {
  it.each`
    type       | kind             | expected
    ${'path'}  | ${'line'}        | ${undefined}
    ${'image'} | ${undefined}     | ${45}
    ${'frame'} | ${undefined}     | ${undefined}
    ${'shape'} | ${'circle'}      | ${45}
    ${'shape'} | ${'rectangle'}   | ${45}
    ${'shape'} | ${'ellipse'}     | ${45}
    ${'shape'} | ${'triangle'}    | ${45}
    ${'shape'} | ${'block-arrow'} | ${45}
  `(
    `should properly include the rotation field for rotateable elements of type $type, kind $kind, rotation $rotation`,
    ({ type, kind, expected }) => {
      let e: Element | undefined = undefined;
      switch (type) {
        case 'path':
          e = mockLineElement({ kind: kind });
          break;
        case 'shape':
          e = mockCircleElement({ kind: kind });
          break;
        case 'frame':
          e = mockFrameElement();
          break;
        case 'image':
          e = mockImageElement();
          break;
        default:
          throw `type ${type} not handled`;
      }

      const override = { rotation: 45 };

      expect(
        (
          mergeElementAndOverride(e, override) as Element & {
            rotation?: number;
          }
        ).rotation,
      ).toBe(expected);
    },
  );

  it.each`
    type       | kind         | rotation     | expected
    ${'image'} | ${undefined} | ${0}         | ${0}
    ${'image'} | ${undefined} | ${undefined} | ${45}
    ${'shape'} | ${'circle'}  | ${undefined} | ${45}
    ${'shape'} | ${'circle'}  | ${0}         | ${0}
  `(
    `should CLEAR the rotation field for rotateable elements of type $type, kind $kind, rotation $rotation`,
    ({ type, kind, rotation, expected }) => {
      let e: Element | undefined = undefined;
      switch (type) {
        case 'shape':
          e = mockCircleElement({ kind: kind, rotation: 45 });
          break;
        case 'image':
          e = mockImageElement({ rotation: 45 });
          break;
        default:
          throw `type ${type} not handled`;
      }

      const override = { rotation: rotation };

      expect(
        (
          mergeElementAndOverride(e, override) as Element & {
            rotation?: number;
          }
        )?.rotation,
      ).toBe(expected);
    },
  );
});
