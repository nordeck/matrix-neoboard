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

export type EllipseElementProps = ShapeElement & WithSelectionProps;

const EllipseDisplay = ({
  readOnly,
  active,
  elementId,
  ...shape
}: EllipseElementProps) => {
  const width = shape.width;
  const height = shape.height;

  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;

  const { strokeColor, strokeWidth, text } = getRenderProperties(shape);

  const renderedChild = (
    <g>
      <ellipse
        cx={shape.position.x + cx}
        cy={shape.position.y + cy}
        fill={shape.fillColor}
        rx={rx}
        ry={ry}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
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
  );

  if (readOnly) {
    return renderedChild;
  }

  return (
    <SelectableElement
      active={active}
      readOnly={readOnly}
      elementId={elementId}
    >
      <MoveableElement
        customHeight={shape.height}
        customWidth={shape.width}
        elementId={elementId}
        {...shape}
      >
        <ElementContextMenu elementId={elementId}>
          {renderedChild}
        </ElementContextMenu>
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(EllipseDisplay);
