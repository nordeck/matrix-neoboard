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
  tailThicknessRatio: number;
  tailThicknessLimit: number;
  arrowWidthRatio: number;
  arrowWidthLimit: number;
  textPadding: number;
};

function createArrowConfig(
  arrowConfig: Partial<ArrowConfig> = {},
): ArrowConfig {
  return {
    tailThicknessRatio: 0.5,
    tailThicknessLimit: 1000,
    arrowWidthRatio: 0.35,
    arrowWidthLimit: 500,
    textPadding: 10,
    ...arrowConfig,
  };
}

export function getRenderProperties(
  shape: ShapeElement,
  arrowConfigOptions?: Partial<ArrowConfig>,
): ElementRenderProperties & BlockArrowRenderProperties {
  const arrowConfig = createArrowConfig(arrowConfigOptions);

  const {
    position,
    textAlignment,
    textBold,
    textItalic,
    textSize,
    textFontFamily,
  } = shape;

  const shapePoints = getShapePointsLocal(shape, arrowConfig);
  const textBox = getTextPositionLocal(
    shape,
    arrowConfig,
    shapePoints.tailRect[0],
  );

  return {
    strokeColor: shape.strokeColor ?? shape.fillColor,
    strokeWidth: shape.strokeWidth ?? 2,
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
    points: addOffsetToShapePath(getShapePath(shapePoints), shape.position),
  };
}

function getTailThickness(
  { height }: ShapeElement,
  { tailThicknessRatio, tailThicknessLimit }: ArrowConfig,
): number {
  const px = height * tailThicknessRatio;
  return px > tailThicknessLimit ? tailThicknessLimit : px;
}

function getArrowSize(
  { width }: ShapeElement,
  { arrowWidthRatio, arrowWidthLimit }: ArrowConfig,
): number {
  const px = width * arrowWidthRatio;
  return px > arrowWidthLimit ? arrowWidthLimit : px;
}

function getTextPadding(
  tailThickness: number,
  { textPadding }: ArrowConfig,
): number {
  return tailThickness > 40 ? textPadding : 0;
}

type ShapePoints = {
  tailRect: Point[];
  arrowTriangleRight: Point[];
};

// returns points in the shape's local coordinate system
function getShapePointsLocal(
  shape: ShapeElement,
  arrowConfig: ArrowConfig,
): ShapePoints {
  const { width, height } = shape;
  const tailSize = getTailThickness(shape, arrowConfig);
  const arrowSize = getArrowSize(shape, arrowConfig);

  // start with top-left clockwise
  const tailRect: Point[] = [
    { x: 0, y: Math.max(0, (height - tailSize) / 2) },
    {
      x: Math.max(0, width - arrowSize),
      y: Math.max(0, (height - tailSize) / 2),
    },
    {
      x: Math.max(0, width - arrowSize),
      y: Math.max(0, (height - tailSize) / 2) + tailSize,
    },
    { x: 0, y: Math.max(0, (height - tailSize) / 2) + tailSize },
  ];

  // start with top point clockwise, the arrow points to the right
  const arrowTriangleRight: Point[] = [
    { x: Math.max(0, width - arrowSize), y: 0 },
    { x: width, y: height / 2 },
    { x: Math.max(0, width - arrowSize), y: height },
  ];

  return {
    tailRect,
    arrowTriangleRight,
  };
}

function getShapePath({ tailRect, arrowTriangleRight }: ShapePoints): Point[] {
  return [
    tailRect[0],
    tailRect[1],
    arrowTriangleRight[0],
    arrowTriangleRight[1],
    arrowTriangleRight[2],
    tailRect[2],
    tailRect[3],
    tailRect[0],
  ];
}

function addOffsetToShapePath(points: Point[], position: Point): Point[] {
  return points.map((p) => ({
    x: p.x + position.x,
    y: p.y + position.y,
  }));
}

function getTextPositionLocal(
  shape: ShapeElement,
  arrowConfig: ArrowConfig,
  shapeFirstPoint: Point,
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const tailThickness = getTailThickness(shape, arrowConfig);
  const arrowSize = getArrowSize(shape, arrowConfig);
  const { height, width } = shape;
  const extensionPx = arrowSize - (arrowSize * tailThickness) / height;
  const padding = getTextPadding(tailThickness, arrowConfig);

  return {
    x: shapeFirstPoint.x + padding,
    y: shapeFirstPoint.y + padding,
    width: width - arrowSize - padding * 2 + extensionPx,
    height: tailThickness - padding * 2,
  };
}
