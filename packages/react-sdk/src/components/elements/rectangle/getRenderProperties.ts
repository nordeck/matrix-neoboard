/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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
  const width = shape.width;
  const height = shape.height;

  const verticalPadding = height > 40 ? 10 : 2;
  const horizontalPadding = width > 40 ? 10 : 2;

  return {
    strokeColor: shape.strokeColor ?? shape.fillColor,
    strokeWidth: shape.strokeWidth ?? 2,
    rx: shape.borderRadius,

    text: {
      position: {
        x: shape.position.x + horizontalPadding,
        y: shape.position.y + verticalPadding,
      },
      width: width - horizontalPadding * 2,
      height: height - verticalPadding * 2,
      alignment: shape.textAlignment ?? 'center',
      bold: shape.textBold ?? false,
      italic: shape.textItalic ?? false,
      fontSize: shape.textSize,
      fontFamily: shape.textFontFamily,
    },
  };
}
