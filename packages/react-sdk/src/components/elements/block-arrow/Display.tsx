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
import { calculateBoundingRectForPoints, ShapeElement } from '../../../state';
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
  const { strokeColor, strokeWidth, text, points } = getRenderProperties(shape);
  const boundingRect = calculateBoundingRectForPoints(points);

  const transform = shape.rotation
    ? `rotate(${shape.rotation} ${shape.position.x + shape.width / 2} ${shape.position.y + shape.height / 2})`
    : undefined;

  const renderedChild = (
    <g data-testid={dataTestid} transform={transform}>
      {/* Block arrow shape with narrow body */}
      <polygon
        data-connect-type="connectable-element"
        points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
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
          y={text.position.y}
          width={text.width}
          height={text.height}
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
        <ElementContextMenu
          elementId={elementId}
          activeElementIds={activeElementIds}
        >
          {renderedChild}
          {elementMovedHasFrame && (
            <ElementFrameOverlay
              transform={transform}
              offsetX={shape.position.x}
              offsetY={shape.position.y}
              width={boundingRect.width}
              height={boundingRect.height}
            />
          )}
        </ElementContextMenu>
      </MoveableElement>
    </SelectableElement>
  );
};

export default React.memo(BlockArrowDisplay);
