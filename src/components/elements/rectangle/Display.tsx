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
import { getRenderProperties } from './getRenderProperties';

export type RectangleElementProps = ShapeElement & WithSelectionProps;

const RectangleDisplay = ({
  readOnly,
  active,
  elementId,
  ...shape
}: RectangleElementProps) => {
  const { strokeColor, strokeWidth, text } = getRenderProperties(shape);

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
          <g>
            <rect
              x={shape.position.x}
              y={shape.position.y}
              fill={shape.fillColor}
              height={shape.height}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              width={shape.width}
            />

            {text && (
              <TextElement
                active={active}
                text={shape.text}
                elementId={elementId}
                x={text.position.x}
                y={text.position.y}
                width={text.width}
                height={text.height}
                fillColor={shape.fillColor}
              />
            )}
          </g>
        </ElementContextMenu>
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(RectangleDisplay);
