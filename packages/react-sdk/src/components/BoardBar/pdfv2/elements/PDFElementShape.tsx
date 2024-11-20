/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

import { Ellipse, Polygon, Rect, Text } from '@react-pdf/renderer';
import { ShapeElement } from '../../../../state';
import { getTextSize } from '../../../Whiteboard/ElementBehaviors/Text/fitText';
import { getRenderProperties as getRenderRectangleProperties } from '../../../elements/rectangle/getRenderProperties';

export default function PDFElementShape({
  element,
}: {
  element: ShapeElement;
}) {
  switch (element.kind) {
    case 'rectangle': {
      const { strokeColor, strokeWidth } =
        getRenderRectangleProperties(element);

      const { fontSize, textWidth } = getTextSize(
        element.width,
        element.height,
        { innerText: element.text },
        { disableLigatures: true },
      );

      return (
        <Rect
          x={element.position.x}
          y={element.position.y}
          width={element.width}
          height={element.height}
          fill={
            element.fillColor === 'transparent' ? undefined : element.fillColor
          }
          stroke={strokeColor === 'transparent' ? undefined : strokeColor}
          strokeWidth={strokeWidth}
          rx={element.borderRadius}
          ry={element.borderRadius}
        >
          {element.text && (
            <Text
              x={element.position.x + element.width / 2 - textWidth / 2}
              y={element.position.y + element.height / 2 + fontSize / 2}
              fill={element.textColor}
              style={{
                fontSize: fontSize,
                fontWeight: element.textBold ? 'bold' : 'normal',
                fontStyle: element.textItalic ? 'italic' : 'normal',
              }}
            >
              {element.text}
            </Text>
          )}
        </Rect>
      );
    }
    case 'ellipse':
    case 'circle':
      return (
        <Ellipse
          cx={element.position.x + element.width / 2}
          cy={element.position.y + element.height / 2}
          rx={element.width / 2}
          ry={element.height / 2}
          fill={
            element.fillColor === 'transparent' ? undefined : element.fillColor
          }
          stroke={
            element.strokeColor === 'transparent'
              ? undefined
              : element.strokeColor
          }
          strokeWidth={element.strokeWidth}
        />
      );
    case 'triangle':
      return (
        <Polygon
          points={`${element.position.x},${element.position.y + element.height} ${element.position.x + element.width},${element.position.y + element.height} ${element.position.x + element.width / 2},${element.position.y}`}
          fill={
            element.fillColor === 'transparent' ? undefined : element.fillColor
          }
          stroke={
            element.strokeColor === 'transparent'
              ? undefined
              : element.strokeColor
          }
          strokeWidth={element.strokeWidth}
        />
      );

    default:
      return null;
  }
}
