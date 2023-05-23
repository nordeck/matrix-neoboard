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

type TriangleRenderProperties = {
  points: {
    p0X: number;
    p0Y: number;
    p1X: number;
    p1Y: number;
    p2X: number;
    p2Y: number;
  };
};

export function getRenderProperties(
  shape: ShapeElement
): ElementRenderProperties & TriangleRenderProperties {
  const width = shape.width;
  const height = shape.height;

  // Based on https://puzzling.stackexchange.com/a/40221
  const fitSquareLength = (width * height) / (width + height);
  const paddingTop = height - fitSquareLength;
  const horizontalPadding = (width - fitSquareLength) / 2;
  const paddingBottom = 10;

  return {
    strokeColor: shape.fillColor,
    strokeWidth: 2,

    text: {
      position: {
        x: shape.position.x + horizontalPadding,
        y: shape.position.y + paddingTop,
      },
      width: width - horizontalPadding * 2,
      height: height - paddingTop - paddingBottom,
    },

    points: {
      p0X: 0,
      p0Y: height,
      p1X: width / 2,
      p1Y: 0,
      p2X: width,
      p2Y: height,
    },
  };
}
