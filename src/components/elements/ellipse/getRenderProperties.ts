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
  shape: ShapeElement
): ElementRenderProperties {
  const width = shape.width;
  const height = shape.height;

  // Based on http://mathcentral.uregina.ca/QQ/database/QQ.09.04/bob1.html
  // just for both axis individually
  const fitSquareLengthX = Math.sqrt(width ** 2 / 2);
  const fitSquareLengthY = Math.sqrt(height ** 2 / 2);
  const horizontalPadding = (width - fitSquareLengthX) / 2;
  const verticalPadding = (height - fitSquareLengthY) / 2;

  return {
    strokeColor: shape.fillColor,
    strokeWidth: 2,

    text: {
      position: {
        x: shape.position.x + horizontalPadding,
        y: shape.position.y + verticalPadding,
      },
      width: fitSquareLengthX,
      height: fitSquareLengthY,
      align: shape.textAlign ?? 'center',
    },
  };
}
