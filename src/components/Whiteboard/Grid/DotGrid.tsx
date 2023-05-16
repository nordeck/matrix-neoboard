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

import { useLayoutState } from '../../Layout';
import { gridCellSize } from '../constants';

export function DotGrid() {
  const { isShowGrid } = useLayoutState();

  return !isShowGrid ? (
    <></>
  ) : (
    <>
      <pattern
        height={gridCellSize}
        id="pattern-circles"
        patternContentUnits="userSpaceOnUse"
        patternUnits="userSpaceOnUse"
        width={gridCellSize}
        x={gridCellSize / 2}
        y={gridCellSize / 2}
      >
        <circle
          cx={gridCellSize / 2}
          cy={gridCellSize / 2}
          fill="#BBB"
          r={gridCellSize / 20}
        />
      </pattern>
      <rect
        fill="url(#pattern-circles)"
        height="100%"
        width="100%"
        x="0"
        y="0"
      />
    </>
  );
}
