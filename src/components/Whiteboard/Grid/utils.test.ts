/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { snapToGrid } from './utils';

describe('snapToGrid', () => {
  it.each`
    value | gridCellSize | result
    ${0}  | ${40}        | ${0}
    ${5}  | ${40}        | ${0}
    ${19} | ${40}        | ${0}
    ${20} | ${40}        | ${40}
    ${20} | ${40}        | ${40}
    ${40} | ${40}        | ${40}
    ${41} | ${40}        | ${40}
  `(
    '$value should snap to $result for grid cell size $gridCellSize',
    ({ value, gridCellSize, result }) => {
      expect(snapToGrid(value, gridCellSize)).toEqual(result);
    },
  );
});
