/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

export type BlockArrowElementProps = ShapeElement &
  WithExtendedSelectionProps & {
    'data-testid'?: string;
  };

const BlockArrowDisplay = ({
  readOnly,
  active,
  elementId,
  activeElementIds = [],
  elements = {},
  elementMovedHasFrame,
  'data-testid': dataTestid,
  ...shape
}: BlockArrowElementProps) => {
  const { strokeColor, strokeWidth, text } = getRenderProperties(shape);

  const { x, y } = shape.position;
  const width = shape.width;
  const height = shape.height;
  // Arrowhead width (proportional)
  const arrowHeadWidth = Math.max(width * 0.35, 10);
  const bodyWidth = width - arrowHeadWidth;

  const inset = height * 0.25;

  const bodyTop = y + inset;
  const bodyBottom = y + height - inset;
  const bodyHeight = bodyBottom - bodyTop;
  const centerY = y + height / 2;

  const frameOffsetY = y - inset;
  const frameHeight = height + inset * 2;
  // Points for block arrow polygon (narrow body, wide tip)
  const points = [
    // Left-top of body
    [x, bodyTop],

    // Right-top of body
    [x + bodyWidth, bodyTop],

    // Arrow head top
    [x + bodyWidth, y],

    // Tip
    [x + width, centerY],

    // Arrow head bottom
    [x + bodyWidth, y + height],

    // Right-bottom of body
    [x + bodyWidth, bodyBottom],

    // Left-bottom of body
    [x, bodyBottom],

    // Close
    [x, bodyTop],
  ]
    .map((pt) => pt.join(','))
    .join(' ');

  const textHeight = text ? Math.min(text.height, bodyHeight) : 0;
  const textY = bodyTop + (bodyHeight - textHeight) / 2;

  const renderedChild = (
    <g data-testid={dataTestid}>
      {/* Block arrow shape with narrow body */}
      <polygon
        points={points}
        fill={shape.fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
      {/* Text overlay */}
      {text && (
        <TextElement
          active={active}
          text={shape.text}
          textAlignment={text.alignment}
          textBold={text.bold}
          textItalic={text.italic}
          elementId={elementId}
          x={text.position.x}
          y={textY}
          width={bodyWidth}
          height={textHeight}
          fillColor={shape.fillColor}
          textColor={shape.textColor}
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
              offsetY={frameOffsetY}
              width={shape.width}
              height={frameHeight}
            />
          )}
        </ElementContextMenu>
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(BlockArrowDisplay);
