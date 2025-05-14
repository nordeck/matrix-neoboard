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
  mockEllipseElement,
  mockLineElement,
  mockPolylineElement,
} from '../../../lib/testUtils/documentTestUtils';
import { lineMarkerChanges, lineMarkerSwitch } from './lineMarkerChanges';

describe('lineMarkerChanges', () => {
  const element0 = mockLineElement();
  const element1 = mockEllipseElement();
  const element2 = mockPolylineElement();

  it('should return an empty list for empty elements', () => {
    expect(lineMarkerChanges('start', {}, 'arrow-head-line')).toEqual([]);
  });

  it('should return updates only for path elements of line kind', () => {
    expect(
      lineMarkerChanges(
        'start',
        {
          'element-0': element0,
          'element-1': element1,
          'element-2': element2,
        },
        'arrow-head-line',
      ),
    ).toEqual([
      {
        elementId: 'element-0',
        patch: {
          startMarker: 'arrow-head-line',
        },
      },
    ]);
  });

  it('should return updates only if there are changes', () => {
    expect(
      lineMarkerChanges(
        'start',
        {
          'element-0': { ...element0, startMarker: 'arrow-head-line' },
          'element-1': element1,
          'element-2': element2,
        },
        'arrow-head-line',
      ),
    ).toEqual([]);
  });

  it('should return updates with switched markers', () => {
    expect(
      lineMarkerSwitch({
        'element-0': {
          ...element0,
          startMarker: undefined,
          endMarker: 'arrow-head-line',
        },
        'element-1': element1,
        'element-2': element2,
      }),
    ).toEqual([
      {
        elementId: 'element-0',
        patch: {
          startMarker: 'arrow-head-line',
          endMarker: undefined,
        },
      },
    ]);
  });
});
