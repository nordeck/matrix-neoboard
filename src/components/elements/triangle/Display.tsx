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
  WithExtendedSelectionProps,
} from '../../Whiteboard';
import { getRenderProperties } from './getRenderProperties';

export type TriangleElementProps = ShapeElement & WithExtendedSelectionProps;

const TriangleDisplay = ({
  readOnly,
  active,
  elementId,
  activeElementIds = [],
  overrides = {},
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
          textAlignment={text.alignment}
          textColor={shape.textColor}
          textBold={text.bold}
          textItalic={text.italic}
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
      <MoveableElement elementId={elementId} overrides={overrides}>
        <ElementContextMenu activeElementIds={activeElementIds}>
          {renderedChild}
        </ElementContextMenu>
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(TriangleDisplay);
