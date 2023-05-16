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

export type TriangleElementProps = ShapeElement & WithSelectionProps;

const TriangleDisplay = ({
  readOnly,
  active,
  elementId,
  ...shape
}: TriangleElementProps) => {
  const strokeWidth = 2;
  const strokeColor = shape.fillColor;
  const width = shape.width;
  const height = shape.height;

  const p0X = 0;
  const p0Y = height;
  const p1X = width / 2;
  const p1Y = 0;
  const p2X = width;
  const p2Y = height;

  // Based on https://puzzling.stackexchange.com/a/40221
  const fitSquareLength = (width * height) / (width + height);
  const defaultPadding = 10;
  const paddingTop = height - fitSquareLength;
  const horizontalPadding = (width - fitSquareLength) / 2;

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
            <polygon
              fill={shape.fillColor}
              points={`${p0X},${p0Y} ${p1X},${p1Y} ${p2X},${p2Y}`}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />

            <TextElement
              active={active}
              elementId={elementId}
              paddingBottom={defaultPadding}
              paddingLeft={horizontalPadding}
              paddingRight={horizontalPadding}
              paddingTop={paddingTop}
              {...shape}
            />
          </g>
        </ElementContextMenu>
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(TriangleDisplay);
