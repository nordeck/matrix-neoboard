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
import {
  calculateBoundingRectForPoints,
  isRotatableElement,
} from '../../../../state';
import { useElementOverrides } from '../../../ElementOverridesProvider';

type ElementOutlineProps = {
  elementIds: Array<string>;
};

export function ElementOutline({ elementIds }: ElementOutlineProps) {
  const elements = Object.values(useElementOverrides(elementIds));
  const theme = useTheme();

  if (elements.length < 2) return null;

  return (
    <g pointerEvents="none">
      {elements.map((element, index) => {
        let width: number;
        let height: number;

        if (element.type === 'path') {
          ({ width, height } = calculateBoundingRectForPoints(element.points));
        } else {
          ({ width, height } = element);
        }

        const transform =
          isRotatableElement(element) && element.rotation
            ? `rotate(${element.rotation} ${element.position.x + element.width / 2} ${element.position.y + element.height / 2})`
            : undefined;

        return (
          <rect
            key={`element-${elementIds[index]}-outline`}
            data-testid={`element-${elementIds[index]}-outline`}
            fill="transparent"
            height={height}
            stroke={theme.palette.primary.main}
            strokeWidth={1}
            width={width}
            transform={transform}
            x={element.position.x}
            y={element.position.y}
          />
        );
      })}
    </g>
  );
}
