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

import { ShapeElement } from '../../../state';
import { ElementRenderProperties } from '../../Whiteboard';

export function getRenderProperties(
  shape: ShapeElement,
): ElementRenderProperties {
  const {
    width,
    height,
    position,
    textAlignment,
    textBold,
    textItalic,
    textSize,
    textFontFamily,
  } = shape;

  // Padding inside the arrow body
  const verticalPadding = height * 0.25; // space from top/bottom of arrow body
  const horizontalPadding = 0;

  const textHeight = height - verticalPadding * 2;
  const textWidth = width * 0.8;

  return {
    strokeColor: shape.strokeColor ?? shape.fillColor,
    strokeWidth: shape.strokeWidth ?? 2,
    text: {
      position: {
        x: position.x + horizontalPadding,
        y: position.y + verticalPadding, // top of arrow body
      },
      width: textWidth - horizontalPadding, // horizontal space inside arrow body
      height: textHeight,
      alignment: textAlignment ?? 'center',
      bold: textBold ?? false,
      italic: textItalic ?? false,
      fontSize: textSize,
      fontFamily: textFontFamily,
    },
  };
}
