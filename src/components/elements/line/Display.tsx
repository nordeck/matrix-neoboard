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

import React from 'react';
import { calculateBoundingRectForPoints, PathElement } from '../../../state';
import {
  ElementContextMenu,
  MoveableElement,
  SelectableElement,
  WithSelectionProps,
} from '../../Whiteboard';

export type LineElementProps = PathElement & WithSelectionProps;

const LineDisplay = ({
  readOnly,
  active,
  elementId,
  ...element
}: LineElementProps) => {
  const strokeWidth = 4;
  const { width, height } = calculateBoundingRectForPoints(element.points);

  const start = element.points[0];
  const end = element.points[element.points.length - 1];

  return (
    <SelectableElement
      active={active}
      readOnly={readOnly}
      elementId={elementId}
    >
      <MoveableElement
        customHeight={height}
        customWidth={width}
        readOnly={readOnly}
        elementId={elementId}
        {...element}
      >
        <ElementContextMenu elementId={elementId} readOnly={readOnly}>
          <g
            transform={`translate(${element.position.x} ${element.position.y})`}
          >
            <line
              fill="none"
              stroke={element.strokeColor}
              strokeWidth={strokeWidth}
              x1={start.x}
              x2={end.x}
              y1={start.y}
              y2={end.y}
            />
          </g>
        </ElementContextMenu>
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(LineDisplay);
