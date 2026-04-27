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

import { Point, ShapeElement } from '../../../state';
import { ElementRenderProperties } from '../../Whiteboard';

type BlockArrowRenderProperties = {
  points: { x: number; y: number }[];
};

type ArrowConfig = {
  tailHeightRatio: number;
  tailHeightLimit: number;
  headWidthRatio: number;
  headWidthLimit: number;
  tailTextPadding: number;
};

function createArrowConfig(
  arrowConfig: Partial<ArrowConfig> = {},
): ArrowConfig {
  return {
    tailHeightRatio: 0.5,
    tailHeightLimit: 1000,
    headWidthRatio: 0.35,
    headWidthLimit: 500,
    tailTextPadding: 10,
    ...arrowConfig,
  };
}

type ArrowRenderConfig = {
  tailHeight: number;
  headWidth: number;
  tailTextPadding: number;
};

function createArrowRenderConfig(
  { width, height }: ShapeElement,
  {
    tailHeightRatio,
    tailHeightLimit,
    headWidthRatio,
    headWidthLimit,
    tailTextPadding,
  }: ArrowConfig,
): ArrowRenderConfig {
  const headWidth = width * headWidthRatio;
  const tailHeight = height * tailHeightRatio;
  return {
    tailHeight: tailHeight > tailHeightLimit ? tailHeightLimit : tailHeight,
    headWidth: headWidth > headWidthLimit ? headWidthLimit : headWidth,
    tailTextPadding: tailHeight > 40 ? tailTextPadding : 0,
  };
}

export function getRenderProperties(
  shape: ShapeElement,
  arrowConfigOptions?: Partial<ArrowConfig>,
): ElementRenderProperties & BlockArrowRenderProperties {
  const arrowConfig = createArrowRenderConfig(
    shape,
    createArrowConfig(arrowConfigOptions),
  );

  const shapePoints = getShapePointsLocal(shape, arrowConfig);
  const textBox = getTextPositionLocal(
    shape,
    arrowConfig,
    shapePoints.tailRect[0],
  );

  const {
    fillColor,
    strokeWidth,
    strokeColor,
    position,
    textAlignment,
    textBold,
    textItalic,
    textSize,
    textFontFamily,
  } = shape;

  return {
    strokeColor: strokeColor ?? fillColor,
    strokeWidth: strokeWidth ?? 2,
    text: {
      position: {
        x: position.x + textBox.x,
        y: position.y + textBox.y,
      },
      width: textBox.width,
      height: textBox.height,
      alignment: textAlignment ?? 'center',
      bold: textBold ?? false,
      italic: textItalic ?? false,
      fontSize: textSize,
      fontFamily: textFontFamily,
    },
    points: getShapePath(shapePoints).map((p) => ({
      x: position.x + p.x,
      y: position.y + p.y,
    })),
  };
}

type ShapePoints = {
  tailRect: Point[];
  headTriangleRight: Point[];
};

// returns points in the shape's local coordinate system
function getShapePointsLocal(
  { width, height }: ShapeElement,
  { tailHeight, headWidth }: ArrowRenderConfig,
): ShapePoints {
  const tailWidth = width - headWidth;
  const tailTopLeftY = Math.max(0, (height - tailHeight) / 2);

  // start with top-left clockwise
  const tailRect: Point[] = [
    { x: 0, y: tailTopLeftY },
    {
      x: Math.max(0, tailWidth),
      y: tailTopLeftY,
    },
    {
      x: Math.max(0, tailWidth),
      y: tailTopLeftY + tailHeight,
    },
    { x: 0, y: tailTopLeftY + tailHeight },
  ];

  // start with top point clockwise, the arrow points to the right
  const arrowTriangleRight: Point[] = [
    { x: Math.max(0, tailWidth), y: 0 },
    { x: width, y: height / 2 },
    { x: Math.max(0, tailWidth), y: height },
  ];

  return {
    tailRect,
    headTriangleRight: arrowTriangleRight,
  };
}

function getShapePath({ tailRect, headTriangleRight }: ShapePoints): Point[] {
  return [
    tailRect[0],
    tailRect[1],
    headTriangleRight[0],
    headTriangleRight[1],
    headTriangleRight[2],
    tailRect[2],
    tailRect[3],
    tailRect[0],
  ];
}

function getTextPositionLocal(
  shape: ShapeElement,
  { tailHeight, headWidth, tailTextPadding }: ArrowRenderConfig,
  shapeFirstPoint: Point,
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const { height, width } = shape;
  const extensionPx = headWidth - (headWidth * tailHeight) / height;

  return {
    x: shapeFirstPoint.x + tailTextPadding,
    y: shapeFirstPoint.y + tailTextPadding,
    width: width - headWidth - tailTextPadding * 2 + extensionPx,
    height: tailHeight - tailTextPadding * 2,
  };
}
