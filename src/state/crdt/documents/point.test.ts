/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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
import { calculateBoundingRectForPoints, pointSchema } from './point';

describe('pointSchema', () => {
  it('should accept event', () => {
    const data = {
      x: 1,
      y: 2,
    };

    expect(pointSchema.validate(data).error).toBeUndefined();
  });

  it('should accept additional properties', () => {
    const data = {
      x: 1,
      y: 2,
      additional: 'data',
    };

    expect(pointSchema.validate(data).error).toBeUndefined();
  });

  it.each<Object>([
    { x: undefined },
    { x: null },
    { x: '1' },
    { y: undefined },
    { y: null },
    { y: '1' },
  ])('should reject event with patch %j', (patch: Object) => {
    const data = {
      x: 1,
      y: 2,
      ...patch,
    };

    expect(pointSchema.validate(data).error).toBeInstanceOf(
      Joi.ValidationError
    );
  });
});

describe('calculateBoundingRectForPoints', () => {
  it('should calculate the bounding rect for an array of points', () => {
    const points = [
      {
        x: 5,
        y: 3,
      },
      {
        x: 2,
        y: 6,
      },
      {
        x: 1,
        y: 4,
      },
    ];
    expect(calculateBoundingRectForPoints(points)).toEqual({
      offsetX: 1,
      offsetY: 3,
      width: 4,
      height: 3,
    });
  });

  it('should calculate the bounding rect for a single point', () => {
    const points = [
      {
        x: 5,
        y: 3,
      },
    ];
    expect(calculateBoundingRectForPoints(points)).toEqual({
      offsetX: 5,
      offsetY: 3,
      width: 0,
      height: 0,
    });
  });

  it('should calculate the bounding rect for an empty array', () => {
    expect(calculateBoundingRectForPoints([])).toEqual({
      offsetX: 0,
      offsetY: 0,
      width: 0,
      height: 0,
    });
  });
});
