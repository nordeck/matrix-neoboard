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

import { describe, expect, it, test } from 'vitest';
import { mockEllipseElement, mockLineElement } from '../../../../lib/testUtils';
import { PathElement, Point, ShapeElement } from '../../../../state';
import {
  angleBetweenPoints,
  calculateBoundaryWithRotationHandle,
  calculateBoundaryWithRotationHandleForElements,
  calculateRotatorHandleCenter,
  checkMultiselect,
  clampAngle,
  getMinMaxFromPoints,
  hasRotatedElements,
  rotateCursor,
  rotatePoint,
} from './rotatorMath';

const newShape = (): ShapeElement => mockEllipseElement();
const newPath = (): PathElement => mockLineElement();

describe('rotatorMath', () => {
  test.each`
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
    'should rotatePoint (1,1) around (0,0) at an angle $angle',
    ({ angle, point }) => {
      const center: Point = { x: 0, y: 0 };
      const p = { x: 1, y: 1 };
      const result = rotatePoint(p, center, angle);
      expect(result.x).toBeCloseTo(point.x, 10);
      expect(result.y).toBeCloseTo(point.y, 10);
    },
  );

  test.each`
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
    'should rotatePoint (0,0) around (1,1) at an angle $angle',
    ({ angle, point }) => {
      const center: Point = { x: 1, y: 1 };
      const p = { x: 0, y: 0 };
      const result = rotatePoint(p, center, angle);
      expect(result.x).toBeCloseTo(point.x, 10);
      expect(result.y).toBeCloseTo(point.y, 10);
    },
  );

  test.each`
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
  `('should find angleBetweenPoints at $angle', ({ angle, expected }) => {
    const p1: Point = { x: 2, y: 2 };
    const center: Point = { x: 1, y: 1 };
    const p2: Point = rotatePoint(p1, center, angle);
    const result = angleBetweenPoints(p1, p2, center);
    // numDigits of 6 cause failed tests, but 5 is good enough
    expect(result).toBeCloseTo(expected, 5);
  });

  test.each`
    a                   | b                   | center              | angle
    ${{ x: 0, y: 115 }} | ${{ x: 0, y: 115 }} | ${{ x: 25, y: 51 }} | ${0}
  `(
    'should find angle $angle  between $a and $b',
    ({ a, b, center, angle }) => {
      const result = angleBetweenPoints(a, b, center);
      expect(result).toBeCloseTo(angle);
    },
  );

  test.each`
    angle   | expected
    ${0}    | ${0}
    ${0.1}  | ${0}
    ${0.5}  | ${0}
    ${0.9}  | ${0}
    ${1}    | ${1}
    ${30}   | ${30}
    ${45}   | ${45}
    ${90}   | ${90}
    ${180}  | ${180}
    ${270}  | ${270}
    ${360}  | ${0}
    ${450}  | ${90}
    ${-30}  | ${330}
    ${-45}  | ${315}
    ${-90}  | ${270}
    ${-180} | ${180}
    ${-270} | ${90}
    ${-360} | ${0}
    ${-450} | ${270}
  `('should clamp the angle $angle to $expected', ({ angle, expected }) => {
    expect(clampAngle(angle)).toBe(expected);
  });

  test.each`
    containerWidth | containerHeight | scale | expected
    ${10}          | ${10}           | ${10} | ${{ center: { x: -3, y: expect.closeTo(11.4) }, width: 1.6, height: 1.6 }}
  `(
    `should calculate the rotation handle's center point for w:$containerWidth h:containerHeight scale:$scale`,
    ({ containerWidth, containerHeight, scale, expected }) => {
      expect(
        calculateRotatorHandleCenter({
          containerWidth,
          containerHeight,
          scale,
        }),
      ).toMatchObject(expected);
    },
  );

  it('should calculate the boundary for the element including the rotation handle', () => {
    const element: ShapeElement = { ...newShape(), rotation: 45 };
    const result = calculateBoundaryWithRotationHandle(element, 10);
    expect(result).toMatchObject({
      height: expect.closeTo(106.07),
      width: expect.closeTo(109.18),
      max: {
        x: expect.closeTo(78.03),
        y: expect.closeTo(104.03),
      },
      min: {
        x: expect.closeTo(-31.14),
        y: expect.closeTo(-2.03),
      },
    });
  });

  it('should calculate the boundary for the selected elements including the rotation handle', () => {
    const element: ShapeElement = { ...newShape(), rotation: 45 };

    const result = calculateBoundaryWithRotationHandleForElements(
      [element],
      10,
    );

    expect(result).toMatchObject({
      height: expect.closeTo(106.07),
      width: expect.closeTo(109.18),
      max: {
        x: expect.closeTo(78.03),
        y: expect.closeTo(104.03),
      },
      min: {
        x: expect.closeTo(-31.14),
        y: expect.closeTo(-2.03),
      },
    });
  });

  test.each`
    elements                   | expected
    ${[]}                      | ${null}
    ${[newPath()]}             | ${null}
    ${[newPath(), newShape()]} | ${null}
  `(
    'should not calculate boundary with rotation handle for $elements',
    ({ elements, expected }) => {
      expect(calculateBoundaryWithRotationHandleForElements(elements, 10)).toBe(
        expected,
      );
    },
  );

  test.fails(
    'should fail calculateBoundaryWithRotationHandle for a path',
    () => {
      const element: PathElement = newPath();
      calculateBoundaryWithRotationHandle(element, 10);
      expect.unreachable('should throw an error');
    },
  );

  test('should getMinMaxFromPoints without applying rotation', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const center: Point = { x: 100, y: 100 };
    expect(getMinMaxFromPoints(points, 0, center)).toStrictEqual({
      height: 10,
      width: 10,
      max: {
        x: 10,
        y: 10,
      },
      min: {
        x: 0,
        y: 0,
      },
    });
  });

  test('should getMinMaxFromPoints for rotated points', () => {
    const points: Point[] = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
    ];
    const center: Point = { x: 100, y: 100 };
    const angle = 60;
    expect(getMinMaxFromPoints(points, angle, center)).toMatchObject({
      height: expect.closeTo(13.66),
      width: expect.closeTo(3.66),
      max: {
        x: expect.closeTo(136.6),
        y: expect.closeTo(-22.94),
      },
      min: {
        x: expect.closeTo(132.94),
        y: expect.closeTo(-36.6),
      },
    });
  });

  test.each`
    cursor         | angle  | expected
    ${'ns-resize'} | ${0}   | ${'ns-resize'}
    ${'ns-resize'} | ${20}  | ${'ns-resize'}
    ${'ns-resize'} | ${30}  | ${'ne-resize'}
    ${'ns-resize'} | ${45}  | ${'ne-resize'}
    ${'ns-resize'} | ${60}  | ${'ne-resize'}
    ${'ns-resize'} | ${90}  | ${'ew-resize'}
    ${'ns-resize'} | ${135} | ${'se-resize'}
    ${'ns-resize'} | ${180} | ${'ns-resize'}
    ${'ns-resize'} | ${225} | ${'sw-resize'}
    ${'ns-resize'} | ${-45} | ${'nw-resize'}
    ${'se-resize'} | ${60}  | ${'ns-resize'}
  `(
    'should rotate cursor $cursor  and at angle $angle it becomes $expected',
    ({ cursor, angle, expected }) => {
      const result = rotateCursor(cursor, angle);
      expect(result).toBe(expected);
    },
  );

  test.each`
    elements                           | expected
    ${{ a: newShape(), b: newPath() }} | ${true}
    ${{ b: newPath() }}                | ${false}
    ${{}}                              | ${false}
  `(
    'should check multiselect detection for $elements to be $expected',
    ({ elements, expected }) => {
      expect(checkMultiselect(elements)).toBe(expected);
    },
  );

  test.each`
    elements                                                | expected
    ${{ a: { rotation: 40, ...newShape() }, x: newPath() }} | ${true}
    ${{ b: newShape(), x: newPath() }}                      | ${false}
    ${{ c: newPath() }}                                     | ${false}
    ${{}}                                                   | ${false}
  `(
    'should check if multiselect detects a rotated element for $elements and expect $expected',
    ({ elements, expected }) => {
      expect(hasRotatedElements(elements)).toBe(expected);
    },
  );
});
