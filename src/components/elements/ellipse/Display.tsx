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
import { ShapeElement } from '../../../state';
import {
  ElementContextMenu,
  MoveableElement,
  SelectableElement,
  TextElement,
  WithSelectionProps,
} from '../../Whiteboard';

export type EllipseElementProps = ShapeElement & WithSelectionProps;

const EllipseDisplay = ({
  readOnly,
  active,
  elementId,
  ...shape
}: EllipseElementProps) => {
  const strokeWidth = 2;
  const strokeColor = shape.fillColor;
  const width = shape.width;
  const height = shape.height;

  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;

  // Based on http://mathcentral.uregina.ca/QQ/database/QQ.09.04/bob1.html
  // just for both axis individually
  const fitSquareLengthX = Math.sqrt(width ** 2 / 2);
  const fitSquareLengthY = Math.sqrt(height ** 2 / 2);
  const horizontalPadding = (width - fitSquareLengthX) / 2;
  const verticalPadding = (height - fitSquareLengthY) / 2;

  return (
    <SelectableElement
      active={active}
      readOnly={readOnly}
      elementId={elementId}
    >
      <MoveableElement
        customHeight={shape.height}
        customWidth={shape.width}
        readOnly={readOnly}
        elementId={elementId}
        {...shape}
      >
        <ElementContextMenu elementId={elementId} readOnly={readOnly}>
          <g transform={`translate(${shape.position.x} ${shape.position.y})`}>
            <ellipse
              cx={cx}
              cy={cy}
              fill={shape.fillColor}
              rx={rx}
              ry={ry}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            <TextElement
              elementId={elementId}
              active={active}
              paddingBottom={verticalPadding}
              paddingLeft={horizontalPadding}
              paddingRight={horizontalPadding}
              paddingTop={verticalPadding}
              {...shape}
            />
          </g>
        </ElementContextMenu>
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(EllipseDisplay);
