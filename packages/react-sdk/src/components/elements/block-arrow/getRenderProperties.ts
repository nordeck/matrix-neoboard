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
  arrowSizeRatio: number;
  arrowSizeMaxPx: number;
  tailThicknessMaxPx: number;
  textPaddingPx: number;
};

function createArrowConfig(
  arrowConfig: Partial<ArrowConfig> = {},
): ArrowConfig {
  return {
    tailThicknessRatio: 0.5,
    arrowSizeRatio: 0.35,
    arrowSizeMaxPx: 500,
    tailThicknessMaxPx: 1000,
    textPaddingPx: 10,
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

  const getTailThicknessPx = (shape: ShapeElement) => {
    const { height } = shape;
    const thicknessLimit = arrowConfig.tailThicknessMaxPx;
    const px = height * arrowConfig.tailThicknessRatio;
    return px > thicknessLimit ? thicknessLimit : px;
  };

  const getArrowSizePx = (shape: ShapeElement) => {
    const { width } = shape;
    const px = width * arrowConfig.arrowSizeRatio;
    const sizeLimit = arrowConfig.arrowSizeMaxPx;
    return px > sizeLimit ? sizeLimit : px;
  };

  const getTextPadding = (shape: ShapeElement) => {
    const tail = getTailThicknessPx(shape);
    const padding = arrowConfig.textPaddingPx;
    return {
      horizontal: tail > 40 ? padding : 0,
      vertical: tail > 40 ? padding : 0,
    };
  };

  // returns points in the shape's local coordinate system
  const getIndividualShapePointsLocal = (shape: ShapeElement) => {
    const { width, height } = shape;
    const tailSize = getTailThicknessPx(shape);
    const arrowSize = getArrowSizePx(shape);

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
  };

  const getShapePointsPathLocal = (shape: ShapeElement): Point[] => {
    const { tailRect, arrowTriangleRight } =
      getIndividualShapePointsLocal(shape);
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
  };

  const getTextBoxPositionLocal = (shape: ShapeElement) => {
    const tailThickness = getTailThicknessPx(shape);
    const arrowSize = getArrowSizePx(shape);
    const { height, width } = shape;
    const extensionPx = arrowSize - (arrowSize * tailThickness) / height;
    const padding = getTextPadding(shape);
    const { tailRect } = getIndividualShapePointsLocal(shape);

    return {
      x: tailRect[0].x + padding.horizontal,
      y: tailRect[0].y + padding.vertical,
      width: width - arrowSize - padding.horizontal * 2 + extensionPx,
      height: tailThickness - padding.vertical * 2,
    };
  };

  const addShapePositionOffsets = (p: Point[]) => {
    return p.map((p) => ({
      x: p.x + position.x,
      y: p.y + position.y,
    }));
  };

  const textBoxLocal = getTextBoxPositionLocal(shape);

  return {
    strokeColor: shape.strokeColor ?? shape.fillColor,
    strokeWidth: shape.strokeWidth ?? 2,
    text: {
      position: {
        x: textBoxLocal.x + position.x,
        y: textBoxLocal.y + position.y,
      },
      width: textBoxLocal.width,
      height: textBoxLocal.height,
      alignment: textAlignment ?? 'center',
      bold: textBold ?? false,
      italic: textItalic ?? false,
      fontSize: textSize,
      fontFamily: textFontFamily,
    },
    points: addShapePositionOffsets(getShapePointsPathLocal(shape)),
  };
}
