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

import { useTheme } from '@mui/material';
import { calculateBoundingRectForPoints } from '../../../../state';
import { useElementOverrides } from '../../../ElementOverridesProvider';

type ElementOutlineProps = {
  elementIds: Array<string>;
};

export function ElementOutline({ elementIds }: ElementOutlineProps) {
  const elements = Object.values(useElementOverrides(elementIds));
  const theme = useTheme();

  return elements.length > 1 ? (
    <g pointerEvents="none">
      {elements.map((element) => {
        let width;
        let height;

        if (element.type === 'path') {
          const boundingRect = calculateBoundingRectForPoints(element.points);

          width = boundingRect.width;
          height = boundingRect.height;
        } else {
          width = element.width;
          height = element.height;
        }

        return (
          <rect
            fill="transparent"
            height={height}
            stroke={theme.palette.primary.main}
            strokeWidth={1}
            width={width}
            x={element.position.x}
            y={element.position.y}
          />
        );
      })}
    </g>
  ) : null;
}
