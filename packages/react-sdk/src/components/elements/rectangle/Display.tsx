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

export type RectangleElementProps = ShapeElement &
  WithExtendedSelectionProps & {
    'data-testid'?: string;
  };

const RectangleDisplay = ({
  readOnly,
  active,
  elementId,
  activeElementIds = [],
  elements = {},
  elementMovedHasFrame,
  'data-testid': dataTestid,
  ...shape
}: RectangleElementProps) => {
  const { rx, strokeColor, strokeWidth, text } = getRenderProperties(shape);
  const stickyNote = shape.stickyNote;

  const shadowFilter = (
    <filter id="bottom-shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow
        dx="0"
        dy="6"
        stdDeviation="5"
        floodColor="black"
        floodOpacity="0.33"
      />
    </filter>
  );

  const rot = shape.rotation ?? 0;

  const renderedChild = (
    <g
      data-testid={dataTestid}
      transform={`rotate(${rot} ${shape.position.x + shape.width / 2} ${shape.position.y + shape.height / 2})`}
      style={stickyNote ? { filter: 'url(#bottom-shadow)' } : {}}
    >
      {stickyNote && shadowFilter}
      <rect
        data-connect-type={`connectable-element`}
        x={shape.position.x}
        y={shape.position.y}
        fill={shape.fillColor}
        height={shape.height}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        width={shape.width}
        rx={rx}
      />

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

export default React.memo(RectangleDisplay);
