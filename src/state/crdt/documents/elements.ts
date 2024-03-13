/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import Joi from 'joi';
import loglevel from 'loglevel';
import {
  BoundingRect,
  calculateBoundingRectForPoints,
  Point,
  pointSchema,
} from './point';

export type ElementBase = {
  type: string;
  position: Point;
};

const elementBaseSchema = Joi.object<ElementBase, true>({
  type: Joi.string().required(),
  position: pointSchema.required(),
})
  .unknown()
  .required();

export type ShapeKind = 'rectangle' | 'circle' | 'ellipse' | 'triangle';
export type TextAlignment = 'left' | 'center' | 'right';

export type ShapeElement = ElementBase & {
  type: 'shape';
  kind: ShapeKind;
  width: number;
  height: number;
  fillColor: string;
  strokeColor?: string;
  strokeWidth?: number;
  text: string;
  textAlignment?: TextAlignment;
};

const shapeElementSchema = elementBaseSchema
  .append<ShapeElement>({
    type: Joi.string().valid('shape').required(),
    kind: Joi.string()
      .valid('rectangle', 'circle', 'ellipse', 'triangle')
      .required(),
    width: Joi.number().strict().required(),
    height: Joi.number().strict().required(),
    fillColor: Joi.string().required(),
    strokeColor: Joi.string().strict(),
    strokeWidth: Joi.number().strict(),
    text: Joi.string().min(0).required(),
    textAlignment: Joi.string().valid('left', 'center', 'right'),
  })
  .required();

export type PathKind = 'line' | 'polyline';

export type EndMarker = 'arrow-head-line';

export type PathElement = ElementBase & {
  type: 'path';
  kind: PathKind;
  points: Point[];
  strokeColor: string;
  endMarker?: EndMarker;
};

const pathElementSchema = elementBaseSchema
  .append<PathElement>({
    type: Joi.string().valid('path').required(),
    kind: Joi.string().valid('line', 'polyline').required(),
    points: Joi.array().items(pointSchema).required(),
    strokeColor: Joi.string().required(),
    endMarker: Joi.string().valid('arrow-head-line'),
  })
  .required();

export type ImageKind = 'image';

export type ImageElement = ElementBase & {
  type: 'image';
  kind: ImageKind;
  width: number;
  height: number;
  /**
   * MXC URI of the image
   * {@link https://spec.matrix.org/v1.9/client-server-api/#matrix-content-mxc-uris}
   */
  mxc: string;
  fileName: string;
};

const imageElementSchema = elementBaseSchema
  .append<ImageElement>({
    type: Joi.string().valid('image').required(),
    kind: Joi.string().valid('image').required(),
    mxc: Joi.string()
      .regex(/mxc:\/\/.*\/.*/)
      .required(),
    fileName: Joi.string().required(),
    width: Joi.number().strict().required(),
    height: Joi.number().strict().required(),
  })
  .required();

export type Element = ShapeElement | PathElement | ImageElement;
export type ElementKind = ShapeKind | PathKind | ImageKind;

export const elementSchema = Joi.alternatives<Element>().conditional('.type', [
  { is: 'shape', then: shapeElementSchema },
  { is: 'path', then: pathElementSchema },
  { is: 'image', then: imageElementSchema },
]);

export function isValidElement(element: unknown): element is Element {
  const result = elementSchema.validate(element);

  if (result.error) {
    loglevel.error('Error while validating the element', result.error);
    return false;
  }

  return true;
}

export function calculateBoundingRectForElements(
  elements: Element[],
): BoundingRect {
  const element = elements.length === 1 ? elements[0] : undefined;

  const elementsBoundingRect =
    elements.length > 1
      ? calculateBoundingRectForPoints(
          elements.flatMap((e) =>
            e.type === 'path'
              ? e.points.map((p) => ({
                  x: e.position.x + p.x,
                  y: e.position.y + p.y,
                }))
              : [
                  { x: e.position.x, y: e.position.y },
                  { x: e.position.x + e.width, y: e.position.y + e.height },
                ],
          ),
        )
      : undefined;

  const x = element?.position.x ?? elementsBoundingRect?.offsetX ?? 0;
  const y = element?.position.y ?? elementsBoundingRect?.offsetY ?? 0;

  const height =
    element?.type === 'path'
      ? calculateBoundingRectForPoints(element.points).height
      : element?.height ?? elementsBoundingRect?.height ?? 0;
  const width =
    element?.type === 'path'
      ? calculateBoundingRectForPoints(element.points).width
      : element?.width ?? elementsBoundingRect?.width ?? 0;

  return { offsetX: x, offsetY: y, width, height };
}

export type Size = {
  width: number;
  height: number;
};

/**
 * Calculate the size of an element so that it fits into a container.
 * Maintain the aspect ratio.
 *
 * @param elementSize - Element size
 * @param containerSize - Container size to fit the element into
 * @returns Fitted element size
 */
export function calculateFittedElementSize(
  elementSize: Size,
  containerSize: Size,
): Size {
  const resultSize = { ...elementSize };

  if (elementSize.width > containerSize.width) {
    const scaleFactor = containerSize.width / elementSize.width;
    resultSize.width = containerSize.width;
    resultSize.height = Math.round(elementSize.height * scaleFactor);
  }

  if (elementSize.height > containerSize.height) {
    const scaleFactor = containerSize.height / elementSize.height;
    resultSize.height = containerSize.height;
    resultSize.width = Math.round(elementSize.width * scaleFactor);
  }

  return resultSize;
}

/**
 * Calculate the position of an element so that it is centred inside a container.
 *
 * @param element - Element containing bounding rectangle size
 * @param containerSize - Container size to centre the element inside
 * @returns Centred top left position
 */
export function calculateCentredPosition(
  element: Size,
  containerSize: Size,
): Point {
  return {
    x: Math.round((containerSize.width - element.width) / 2),
    y: Math.round((containerSize.height - element.height) / 2),
  };
}
