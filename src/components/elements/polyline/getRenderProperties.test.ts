/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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

import { getRenderProperties } from './getRenderProperties';

describe('getRenderProperties', () => {
  it('should provide the properties for a polyline element', () => {
    expect(
      getRenderProperties({
        type: 'path',
        kind: 'polyline',
        position: { x: 10, y: 15 },
        strokeColor: '#00ffff',
        points: [
          { x: 0, y: 1 },
          { x: 2, y: 3 },
          { x: 5, y: 10 },
        ],
      }),
    ).toEqual({
      strokeColor: '#00ffff',
      strokeWidth: 4,

      points: [
        { x: 10, y: 16 },
        { x: 12, y: 18 },
        { x: 15, y: 25 },
      ],
      box: {
        height: 9,
        width: 5,
      },
    });
  });
});
