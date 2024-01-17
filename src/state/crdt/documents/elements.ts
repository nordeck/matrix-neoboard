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

export type ShapeElement = ElementBase & {
  type: 'shape';
  kind: ShapeKind;
  width: number;
  height: number;
  fillColor: string;
  text: string;
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
    text: Joi.string().min(0).required(),
  })
  .required();

export type PathKind = 'line' | 'polyline';

export type PathElement = ElementBase & {
  type: 'path';
  kind: PathKind;
  points: Point[];
  strokeColor: string;
};

const pathElementSchema = elementBaseSchema
  .append<PathElement>({
    type: Joi.string().valid('path').required(),
    kind: Joi.string().valid('line', 'polyline').required(),
    points: Joi.array().items(pointSchema).required(),
    strokeColor: Joi.string().required(),
  })
  .required();

export type Element = ShapeElement | PathElement;

export const elementSchema = Joi.alternatives<Element>().conditional('.type', [
  { is: 'shape', then: shapeElementSchema },
  { is: 'path', then: pathElementSchema },
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
