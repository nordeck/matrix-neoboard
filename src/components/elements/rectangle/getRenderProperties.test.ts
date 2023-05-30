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
  it('should provide the properties for a rectangle element', () => {
    const view = getRenderProperties({
      type: 'shape',
      kind: 'rectangle',
      position: { x: 10, y: 15 },
      fillColor: '#00ffff',
      width: 100,
      height: 50,
      text: 'My Text',
    });

    expect(view).toEqual({
      strokeColor: '#00ffff',
      strokeWidth: 2,

      text: {
        position: { x: 20, y: 25 },
        width: 80,
        height: 30,
      },
    });
  });
});
