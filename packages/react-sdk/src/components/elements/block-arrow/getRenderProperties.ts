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

type BlockArrowRenderProperties = {
  points: { x: number; y: number }[];
};

export function getRenderProperties(
  shape: ShapeElement,
): ElementRenderProperties & BlockArrowRenderProperties {
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

  // Layout ratios, Chosen to visually match design spec
  const VERTICAL_PADDING_RATIO = 0.25;
  const headWidthRatio = 0.35;

  const x = position.x;
  const y = position.y;
  const verticalPadding = height * VERTICAL_PADDING_RATIO;
  const horizontalPadding = width > 40 ? 10 : 2;

  const headWidth = width * headWidthRatio;

  const bodyTop = y + verticalPadding;
  const bodyBottom = y + height - verticalPadding;

  const bodyHeight = bodyBottom - bodyTop;
  const bodyWidth = width - headWidth;

  const bodyRightX = x + bodyWidth;

  const verticalTextPadding = bodyHeight > 40 ? 10 : 2;

  const textHeight = Math.max(bodyHeight - verticalTextPadding * 2, 0);
  const textWidth = Math.max(
    bodyWidth + headWidth * (1 - bodyHeight / height) - horizontalPadding * 2,
    0,
  );
  const textY = bodyTop + verticalTextPadding;
  const textX = x + horizontalPadding;

  return {
    strokeColor: shape.strokeColor ?? shape.fillColor,
    strokeWidth: shape.strokeWidth ?? 2,
    text: {
      position: {
        x: textX,
        y: textY,
      },
      width: textWidth,
      height: textHeight,
      alignment: textAlignment ?? 'center',
      bold: textBold ?? false,
      italic: textItalic ?? false,
      fontSize: textSize,
      fontFamily: textFontFamily,
    },
    points: [
      // Left-top of body
      { x, y: bodyTop },
      // Right-top of body
      { x: bodyRightX, y: bodyTop },
      // Arrow head top
      { x: bodyRightX, y: y },
      // Tip
      { x: x + width, y: y + height / 2 },
      // Arrow head bottom
      { x: bodyRightX, y: y + height },
      // Right-bottom of body
      { x: bodyRightX, y: bodyBottom },
      // Left-bottom of body
      { x: x, y: bodyBottom },
    ],
  };
}
