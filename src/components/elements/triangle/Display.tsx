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

export type TriangleElementProps = ShapeElement & WithSelectionProps;

const TriangleDisplay = ({
  readOnly,
  active,
  elementId,
  ...shape
}: TriangleElementProps) => {
  const {
    strokeColor,
    strokeWidth,
    text,
    points: { p0X, p0Y, p1X, p1Y, p2X, p2Y },
  } = getRenderProperties(shape);

  const renderedChild = (
    <g>
      <polygon
        fill={shape.fillColor}
        points={`${p0X},${p0Y} ${p1X},${p1Y} ${p2X},${p2Y}`}
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
      <MoveableElement>
        <ElementContextMenu elementId={elementId}>
          {renderedChild}
        </ElementContextMenu>
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(TriangleDisplay);
