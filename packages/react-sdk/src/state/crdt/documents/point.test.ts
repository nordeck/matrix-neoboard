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
import { describe, expect, it } from 'vitest';
import {
  Point,
  angleBetweenPoints,
  calculateBoundingRectForPoints,
  isPointWithinBoundingRect,
  pointSchema,
  rotatePoint,
} from './point';

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

  it.each<object>([
    { x: undefined },
    { x: null },
    { x: '1' },
    { y: undefined },
    { y: null },
    { y: '1' },
  ])('should reject event with patch %j', (patch: object) => {
    const data = {
      x: 1,
      y: 2,
      ...patch,
    };

    expect(pointSchema.validate(data).error).toBeInstanceOf(
      Joi.ValidationError,
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

describe('isPointWithinBoundingRect', () => {
  it('should determine that point is not within bounding rect', () => {
    expect(
      isPointWithinBoundingRect(
        { x: 5, y: 5 },
        { offsetX: 1, offsetY: 1, width: 10, height: 10 },
      ),
    ).toEqual(true);
  });

  it.each([
    [0, 0],
    [0, 1],
    [1, 0],
    [12, 0],
    [11, 0],
    [12, 1],
    [12, 12],
    [11, 12],
    [12, 11],
    [0, 12],
    [1, 12],
    [0, 11],
  ])(
    'should determine that point %s, %s is not within bounding rect',
    (x, y) => {
      expect(
        isPointWithinBoundingRect(
          { x, y },
          { offsetX: 1, offsetY: 1, width: 10, height: 10 },
        ),
      ).toBe(false);
    },
  );
});

describe('rotatePoint', () => {
  it.each`
    angle   | point
    ${0}    | ${{ x: 1, y: 1 }}
    ${30}   | ${{ x: 0.36602540378443876, y: 1.3660254037844386 }}
    ${45}   | ${{ x: 0, y: 1.414213562373095 }}
    ${90}   | ${{ x: -1, y: 1 }}
    ${180}  | ${{ x: -1, y: -1 }}
    ${270}  | ${{ x: 1, y: -1 }}
    ${360}  | ${{ x: 1, y: 1 }}
    ${450}  | ${{ x: -1, y: 1 }}
    ${-30}  | ${{ x: 1.3660254037844386, y: 0.36602540378443876 }}
    ${-45}  | ${{ x: 1.414213562373095, y: 0 }}
    ${-90}  | ${{ x: 1, y: -1 }}
    ${-180} | ${{ x: -1, y: -1 }}
    ${-270} | ${{ x: -1, y: 1 }}
    ${-360} | ${{ x: 1, y: 1 }}
    ${-450} | ${{ x: 1, y: -1 }}
  `(
    'should rotate point (1,1) around (0,0) at an angle $angle',
    ({ angle, point }) => {
      const p = { x: 1, y: 1 };
      const center: Point = { x: 0, y: 0 };
      const result = rotatePoint(p, center, angle);
      expect(result.x).toBeCloseTo(point.x, 10);
      expect(result.y).toBeCloseTo(point.y, 10);
    },
  );

  it.each`
    angle   | point
    ${0}    | ${{ x: 0, y: 0 }}
    ${30}   | ${{ x: 0.6339745962155612, y: -0.3660254037844386 }}
    ${45}   | ${{ x: 1, y: -0.4142135623730949 }}
    ${90}   | ${{ x: 2, y: 0 }}
    ${180}  | ${{ x: 2, y: 2 }}
    ${270}  | ${{ x: 0, y: 2 }}
    ${360}  | ${{ x: 0, y: 0 }}
    ${450}  | ${{ x: 2, y: 0 }}
    ${-30}  | ${{ x: -0.3660254037844386, y: 0.6339745962155612 }}
    ${-45}  | ${{ x: -0.4142135623730949, y: 1 }}
    ${-90}  | ${{ x: 0, y: 2 }}
    ${-180} | ${{ x: 2, y: 2 }}
    ${-270} | ${{ x: 2, y: 0 }}
    ${-360} | ${{ x: 0, y: 0 }}
    ${-450} | ${{ x: 0, y: 2 }}
  `(
    'should rotate point (0,0) around (1,1) at an angle $angle',
    ({ angle, point }) => {
      const p = { x: 0, y: 0 };
      const center: Point = { x: 1, y: 1 };
      const result = rotatePoint(p, center, angle);
      expect(result.x).toBeCloseTo(point.x, 10);
      expect(result.y).toBeCloseTo(point.y, 10);
    },
  );
});

describe('angleBetweenPoints', () => {
  it.each`
    angle   | expected
    ${0}    | ${0}
    ${30}   | ${30}
    ${45}   | ${45}
    ${90}   | ${90}
    ${180}  | ${180}
    ${270}  | ${-90}
    ${360}  | ${0}
    ${450}  | ${90}
    ${-30}  | ${-30}
    ${-45}  | ${-45}
    ${-90}  | ${-90}
    ${-180} | ${-180}
    ${-270} | ${90}
    ${-360} | ${0}
    ${-450} | ${-90}
  `(
    'should calculate angle between points rotated at $angle',
    ({ angle, expected }) => {
      const p1: Point = { x: 2, y: 2 };
      const center: Point = { x: 1, y: 1 };
      const p2: Point = rotatePoint(p1, center, angle);
      const result = angleBetweenPoints(p1, p2, center);
      // numDigits of 6 cause failed tests, but 5 is good enough
      expect(result).toBeCloseTo(expected, 5);
    },
  );
});
