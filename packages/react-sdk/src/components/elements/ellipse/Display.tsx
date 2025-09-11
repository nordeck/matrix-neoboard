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
import { ElementFrameOverlay } from '../ElementFrameOverlay';
import { getRenderProperties } from './getRenderProperties';

export type EllipseElementProps = ShapeElement & WithExtendedSelectionProps;

const EllipseDisplay = ({
  readOnly,
  active,
  elementId,
  activeElementIds = [],
  elements = {},
  elementMovedHasFrame,
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
    <g data-testid={`element-ellipse-${elementId}`}>
      <ellipse
        data-connect-type={`connectable-element`}
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
          textColor={shape.textColor}
          textAlignment={text.alignment}
          textBold={text.bold}
          textItalic={text.italic}
          elementId={elementId}
          x={text.position.x}
          y={text.position.y}
          width={text.width}
          height={text.height}
          fillColor={shape.fillColor}
          fontSize={text.fontSize}
          fontFamily={shape.textFontFamily}
          setTextToolsEnabled={shape.setTextToolsEnabled}
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
      <MoveableElement elementId={elementId} elements={elements}>
        <ElementContextMenu activeElementIds={activeElementIds}>
          {renderedChild}
          {elementMovedHasFrame && (
            <ElementFrameOverlay
              offsetX={shape.position.x}
              offsetY={shape.position.y}
              width={shape.width}
              height={shape.height}
            />
          )}
        </ElementContextMenu>
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(EllipseDisplay);
