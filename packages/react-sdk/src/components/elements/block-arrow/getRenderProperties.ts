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
  /** Tail to shape height ratio */
  tailHeightRatio: number;
  /** Max tail height */
  tailHeightLimit: number;
  /** Arrow triangle (head) to shape width ratio */
  headWidthRatio: number;
  /** Max arrow triangle (head) width */
  headWidthLimit: number;
};

const defaultArrowConfig: ArrowConfig = {
  tailHeightRatio: 0.5,
  tailHeightLimit: 1000,
  headWidthRatio: 0.35,
  headWidthLimit: 500,
};

export function getRenderProperties(
  shape: ShapeElement,
  arrowConfigOptions?: Partial<ArrowConfig>,
): ElementRenderProperties & BlockArrowRenderProperties {
  const arrowParameters = createArrowParameters(
    shape,
    createArrowConfig(arrowConfigOptions),
  );

  const shapePoints = getShapePointsLocal(shape, arrowParameters);
  const textBox = getTextPositionLocal(
    shape,
    arrowParameters,
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

function createArrowConfig(
  arrowConfigOptions: Partial<ArrowConfig> | undefined,
): ArrowConfig {
  return arrowConfigOptions
    ? {
        ...defaultArrowConfig,
        ...arrowConfigOptions,
      }
    : defaultArrowConfig;
}

type ArrowParameters = {
  tailHeight: number;
  headWidth: number;
  tailTextPadding: number;
};

function createArrowParameters(
  { width, height }: ShapeElement,
  {
    tailHeightRatio,
    tailHeightLimit,
    headWidthRatio,
    headWidthLimit,
  }: ArrowConfig,
): ArrowParameters {
  const headWidth = width * headWidthRatio;
  const tailHeight = height * tailHeightRatio;
  return {
    tailHeight: tailHeight > tailHeightLimit ? tailHeightLimit : tailHeight,
    headWidth: headWidth > headWidthLimit ? headWidthLimit : headWidth,
    tailTextPadding: tailHeight > 40 ? 10 : 2,
  };
}

type ShapePoints = {
  tailRect: Point[];
  headTriangleRight: Point[];
};

// returns points in the shape's local coordinate system
function getShapePointsLocal(
  { width, height }: ShapeElement,
  { tailHeight, headWidth }: ArrowParameters,
): ShapePoints {
  const tailWidth = width - headWidth;
  const tailTopLeftY = (height - tailHeight) / 2;

  // start with top-left clockwise
  const tailRect: Point[] = [
    { x: 0, y: tailTopLeftY },
    {
      x: tailWidth,
      y: tailTopLeftY,
    },
    {
      x: tailWidth,
      y: tailTopLeftY + tailHeight,
    },
    { x: 0, y: tailTopLeftY + tailHeight },
  ];

  // start with top point clockwise, the arrow points to the right
  const arrowTriangleRight: Point[] = [
    { x: tailWidth, y: 0 },
    { x: width, y: height / 2 },
    { x: tailWidth, y: height },
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
  ];
}

function getTextPositionLocal(
  { height, width }: ShapeElement,
  { tailHeight, headWidth, tailTextPadding }: ArrowParameters,
  tailTopLeftPosition: Point,
): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const headExtension = headWidth - (headWidth * tailHeight) / height;

  return {
    x: tailTopLeftPosition.x + tailTextPadding,
    y: tailTopLeftPosition.y + tailTextPadding,
    width: width - headWidth + headExtension - tailTextPadding * 2,
    height: tailHeight - tailTextPadding * 2,
  };
}
