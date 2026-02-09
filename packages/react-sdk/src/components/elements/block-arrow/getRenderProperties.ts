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

import { clamp } from 'lodash';
import { ShapeElement } from '../../../state';
import { ElementRenderProperties } from '../../Whiteboard';

type BlockArrowRenderProperties = {
  points: { x: number; y: number }[];
};

type HeadBoundaryArgs = {
  yPos: number;
  x: number;
  y: number;
  height: number;
  bodyWidth: number;
  arrowHeadWidth: number;
  halfHeight: number;
};

export function getRenderProperties(
  shape: ShapeElement,
): ElementRenderProperties & BlockArrowRenderProperties {
  const {
    width,
    height,
    position,
    blockArrowHead,
    textAlignment,
    textBold,
    textItalic,
    textSize,
    textFontFamily,
  } = shape;

  // Layout ratios, Chosen to visually match design spec
  const VERTICAL_PADDING_RATIO = 0.25;
  const ARROW_HEAD_WIDTH_RATIO = 0.35;

  const x = position.x;
  const y = position.y;
  const verticalPadding = height * VERTICAL_PADDING_RATIO;
  const horizontalPadding = width > 40 ? 10 : 2;

  const arrowHeadWidth = width * ARROW_HEAD_WIDTH_RATIO;
  const bodyWidth = width - arrowHeadWidth;
  const bodyRight = x + bodyWidth;
  const bodyTop = y + verticalPadding;
  const bodyBottom = y + height - verticalPadding;
  const bodyHeight = bodyBottom - bodyTop;
  const centerY = y + height / 2;

  const verticalTextPadding = bodyHeight > 40 ? 10 : 2;
  const textTop = bodyTop + verticalTextPadding;
  const textBottom = bodyBottom - verticalTextPadding;
  const textHeight = Math.max(textBottom - textTop, 0);
  const halfHeight = height / 2;

  // Use the tighter boundary so the full text box fits.
  const textRightBoundary = Math.min(
    getHeadBoundaryAtY({
      yPos: textTop,
      x,
      y,
      height,
      bodyWidth,
      arrowHeadWidth,
      halfHeight,
    }),
    getHeadBoundaryAtY({
      yPos: textBottom,
      x,
      y,
      height,
      bodyWidth,
      arrowHeadWidth,
      halfHeight,
    }),
  );

  const availableWidth = Math.max(textRightBoundary - x, 0);
  const safePadding = Math.min(horizontalPadding, availableWidth / 2);
  const textWidth = Math.max(availableWidth - safePadding * 2, 0);
  let textX = x + safePadding;

  const flipXWithinBounds = (value: number) => x + width - (value - x);
  const points = [
    // Left-top of body
    { x, y: bodyTop },
    // Right-top of body
    { x: bodyRight, y: bodyTop },
    // Arrow head top
    { x: bodyRight, y: y },
    // Tip
    { x: x + width, y: centerY },
    // Arrow head bottom
    { x: bodyRight, y: y + height },
    // Right-bottom of body
    { x: bodyRight, y: bodyBottom },
    // Left-bottom of body
    { x: x, y: bodyBottom },
  ];

  const isLeft = blockArrowHead === 'start';

  if (isLeft) {
    textX = flipXWithinBounds(textX + textWidth);
  }

  const renderPoints = isLeft
    ? points.map((point) => ({ x: flipXWithinBounds(point.x), y: point.y }))
    : points;

  return {
    strokeColor: shape.strokeColor ?? shape.fillColor,
    strokeWidth: shape.strokeWidth ?? 2,
    text: {
      position: {
        x: textX,
        y: textTop,
      },
      width: textWidth,
      height: textHeight,
      alignment: textAlignment ?? 'center',
      bold: textBold ?? false,
      italic: textItalic ?? false,
      fontSize: textSize,
      fontFamily: textFontFamily,
    },
    points: renderPoints,
  };
}

// Rightmost x inside the arrow head at a given y.
const getHeadBoundaryAtY = ({
  yPos,
  x,
  y,
  height,
  bodyWidth,
  arrowHeadWidth,
  halfHeight,
}: HeadBoundaryArgs): number => {
  if (halfHeight === 0) {
    return x + bodyWidth;
  }
  const bodyRight = x + bodyWidth;
  const clampedY = clamp(yPos, y, y + height);
  const distanceToTop = clampedY - y;
  const distanceToBottom = y + height - clampedY;
  const t = Math.min(distanceToTop, distanceToBottom) / halfHeight;
  return bodyRight + arrowHeadWidth * t;
};
