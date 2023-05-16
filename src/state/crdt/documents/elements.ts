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
import { Point, pointSchema } from './point';

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
