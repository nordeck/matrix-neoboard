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
  const TEXT_WIDTH_RATIO = 0.85;
  const ARROW_HEAD_WIDTH_RATIO = 0.35;

  const verticalPadding = height * VERTICAL_PADDING_RATIO; // space from top/bottom of arrow body
  const horizontalPadding = width > 40 ? 10 : 2;

  const textHeight = height - verticalPadding * 2;
  const textWidth = width * TEXT_WIDTH_RATIO;

  const arrowHeadWidth = width * ARROW_HEAD_WIDTH_RATIO;
  const bodyWidth = width - arrowHeadWidth;
  const bodyTop = position.y + verticalPadding;
  const bodyBottom = position.y + height - verticalPadding;
  const centerY = position.y + height / 2;

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
    points: [
      // Left-top of body
      { x: position.x, y: bodyTop },
      // Right-top of body
      { x: position.x + bodyWidth, y: bodyTop },
      // Arrow head top
      { x: position.x + bodyWidth, y: position.y },
      // Tip
      { x: position.x + width, y: centerY },
      // Arrow head bottom
      { x: position.x + bodyWidth, y: position.y + height },
      // Right-bottom of body
      { x: position.x + bodyWidth, y: bodyBottom },
      // Left-bottom of body
      { x: position.x, y: bodyBottom },
    ],
  };
}
