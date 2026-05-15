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

import { beforeEach, describe, expect, it, test } from 'vitest';
import {
  mockEllipseElement,
  mockLineElement,
} from '../../../../lib/testUtils/documentTestUtils';
import { Elements, Point, ShapeElement } from '../../../../state';
import { DragEvent } from './ResizeHandle';
import { Dimensions, ResizableProperties } from './types';
import {
  calculateDimensions,
  computeDragWithRotation,
  computeResizing,
  computeResizingConnectingPathElement,
  getLockAspectRatio,
  pointResizerRotatedFactory,
  pointResizerUnrotatedFactory,
  resizeInfoRotated,
} from './utils';

describe('resizing utils for rotated elements', () => {
  const viewportWidth = 100;
  const viewportHeight = 110;
  let startDimension: Dimensions;

  beforeEach(() => {
    startDimension = {
      x: 15,
      y: 30,
      width: 20,
      height: 40,
    };
  });

  test.each`
    handlePosition   | dragX | dragY | expectedX | expectedY | expectedWidth | expectedHeight
    ${'top'}         | ${25} | ${20} | ${15}     | ${51.46}  | ${20}         | ${18.54}
    ${'top'}         | ${25} | ${50} | ${15}     | ${70}     | ${20}         | ${2.68}
    ${'topRight'}    | ${25} | ${20} | ${9.04}   | ${51.46}  | ${5.96}       | ${18.54}
    ${'topRight'}    | ${25} | ${50} | ${15}     | ${70}     | ${15.25}      | ${2.68}
    ${'right'}       | ${45} | ${50} | ${15}     | ${30}     | ${29.39}      | ${40}
    ${'right'}       | ${5}  | ${50} | ${15}     | ${30}     | ${1.11}       | ${40}
    ${'bottomRight'} | ${45} | ${50} | ${15}     | ${30}     | ${29.39}      | ${28.54}
    ${'bottomRight'} | ${5}  | ${20} | ${0}      | ${30}     | ${15}         | ${35.61}
    ${'bottom'}      | ${15} | ${80} | ${15}     | ${30}     | ${20}         | ${70.96}
    ${'bottom'}      | ${15} | ${5}  | ${15}     | ${30}     | ${20}         | ${17.93}
    ${'bottomLeft'}  | ${30} | ${80} | ${35}     | ${30}     | ${20}         | ${60.36}
    ${'bottomLeft'}  | ${5}  | ${5}  | ${0}      | ${30}     | ${35}         | ${25}
    ${'left'}        | ${30} | ${40} | ${26.72}  | ${30}     | ${8.28}       | ${40}
    ${'left'}        | ${5}  | ${5}  | ${0}      | ${30}     | ${35}         | ${40}
    ${'topLeft'}     | ${25} | ${20} | ${9.04}   | ${51.46}  | ${25.96}      | ${18.54}
    ${'topLeft'}     | ${5}  | ${50} | ${16.11}  | ${70}     | ${18.89}      | ${16.82}
  `(
    'should calculate dimensions for drag at $handlePosition to $dragX,$dragY rotated',
    ({
      handlePosition,
      dragX,
      dragY,
      expectedX,
      expectedY,
      expectedWidth,
      expectedHeight,
    }) => {
      const event = {
        deltaX: 1,
        deltaY: 1,
        lockAspectRatio: false,
        x: dragX,
        y: dragY,
      };

      const rotatedElement: ShapeElement = mockEllipseElement({
        position: { x: 50, y: 50 },
        width: 10,
        height: 10,
        rotation: 45,
      });

      const result = calculateDimensions(
        handlePosition,
        { a: rotatedElement },
        event,
        startDimension,
        viewportWidth,
        viewportHeight,
      );

      expect(result).toMatchObject({
        x: expect.closeTo(expectedX),
        y: expect.closeTo(expectedY),
        width: expect.closeTo(expectedWidth),
        height: expect.closeTo(expectedHeight),
      });
    },
  );

  test.each`
    rotation | cursor              | expected
    ${0}     | ${{ x: 60, y: 60 }} | ${{ dragX: 60, dragY: 60 }}
    ${45}    | ${{ x: 60, y: 60 }} | ${{ dragX: 62.07, dragY: 55 }}
    ${90}    | ${{ x: 60, y: 60 }} | ${{ dragX: 60, dragY: 50 }}
  `(
    'should computeDragWithRotation rot $rotation, cursor $cursor',
    ({ rotation, cursor, expected }) => {
      const event: DragEvent = {
        x: cursor.x,
        y: cursor.y,
        lockAspectRatio: false,
      };

      const elements = {
        a: mockEllipseElement({
          position: { x: 50, y: 50 },
          width: 10,
          height: 10,
          rotation: rotation,
        }),
      };

      const result = computeDragWithRotation(
        event,
        elements,
        viewportWidth,
        viewportHeight,
      );

      expect(result).toMatchObject({
        dragX: expect.closeTo(expected.dragX),
        dragY: expect.closeTo(expected.dragY),
      });
    },
  );

  it.each`
    rotated | expected | info
    ${0}    | ${false} | ${'not force aspect ratio'}
    ${10}   | ${true}  | ${'force aspect ratio'}
  `('should $info in a multi-select scenario', ({ rotated, expected }) => {
    const event: DragEvent = {
      x: 0,
      y: 0,
      lockAspectRatio: false,
    };
    const elements = {
      a: mockEllipseElement({
        rotation: rotated,
      }),
      b: mockEllipseElement(),
    };
    const result = getLockAspectRatio(event, elements, false);
    expect(result).toBe(expected);
  });

  test.each`
    name             | dragX  | dragY  | expectedEllipseX | expectedEllipseY | expectedEllipseWidth | expectedEllipseHeight | expectedLineX | expectedLineY | expectedLineWidth | expectedLineHeight
    ${'top'}         | ${120} | ${40}  | ${179.25}        | ${306.67}        | ${0.5}               | ${0.5}                | ${179.25}     | ${307.17}     | ${1.5}            | ${0.5}
    ${'topRight'}    | ${360} | ${40}  | ${255}           | ${200}           | ${0.33}              | ${0.33}               | ${255}        | ${200.33}     | ${1}              | ${0.33}
    ${'right'}       | ${360} | ${120} | ${270}           | ${159.67}        | ${0.33}              | ${0.33}               | ${270}        | ${160}        | ${1}              | ${0.33}
    ${'bottomRight'} | ${360} | ${280} | ${100}           | ${106.67}        | ${6.67}              | ${6.67}               | ${100}        | ${113.33}     | ${20}             | ${6.67}
    ${'bottom'}      | ${120} | ${280} | ${100}           | ${120}           | ${53.33}             | ${53.33}              | ${100}        | ${173.33}     | ${160}            | ${53.33}
    ${'bottomLeft'}  | ${0}   | ${280} | ${255}           | ${120}           | ${0.33}              | ${0.33}               | ${255}        | ${120.33}     | ${1}              | ${0.33}
    ${'left'}        | ${0}   | ${120} | ${390}           | ${159.67}        | ${0.33}              | ${0.33}               | ${390}        | ${160}        | ${1}              | ${0.33}
    ${'topLeft'}     | ${0}   | ${40}  | ${0}             | ${40}            | ${80}                | ${80}                 | ${0}          | ${120}        | ${240}            | ${80}
  `(
    'should computeResizing() of multi-select with a rotated ellipse and line when dragging handle $name',
    ({
      name,
      dragX,
      dragY,
      expectedEllipseX,
      expectedEllipseY,
      expectedEllipseWidth,
      expectedEllipseHeight,
      expectedLineX,
      expectedLineY,
      expectedLineWidth,
      expectedLineHeight,
    }) => {
      const event = {
        deltaX: 0,
        deltaY: 0,
        lockAspectRatio: false,
        x: 0,
        y: 0,
      };
      const gridCellSize = 20;

      const line = mockLineElement({
        position: { x: 120, y: 160 },
        points: [
          { x: 0, y: 0 },
          { x: 120, y: 40 },
        ],
      });

      const ellipse: ShapeElement = mockEllipseElement({
        position: { x: 120, y: 120 },
        width: 40,
        height: 40,
        rotation: 45,
      });

      // because this is a multi-select, the aspect ratio should be locked

      const result = computeResizing(
        { name, containerWidth: 120, containerHeight: 80 },
        { ...event, x: dragX, y: dragY },
        viewportWidth,
        viewportHeight,
        false,
        gridCellSize,
        {
          x: 120,
          y: 120,
          width: 120,
          height: 80,
          elements: { ellipse, line },
        },
      );

      expect(result).toMatchObject([
        {
          elementId: 'ellipse',
          elementOverride: {
            position: {
              x: expect.closeTo(expectedEllipseX),
              y: expect.closeTo(expectedEllipseY),
            },
            width: expect.closeTo(expectedEllipseWidth),
            height: expect.closeTo(expectedEllipseHeight),
            points: undefined,
          },
        },
        {
          elementId: 'line',
          elementOverride: {
            position: {
              x: expect.closeTo(expectedLineX),
              y: expect.closeTo(expectedLineY),
            },
            width: undefined,
            height: undefined,
            points: [
              { x: 0, y: 0 },
              {
                x: expect.closeTo(expectedLineWidth),
                y: expect.closeTo(expectedLineHeight),
              },
            ],
          },
        },
      ]);
    },
  );

  test.each`
    name             | dragX  | dragY  | expectedEllipseX | expectedEllipseY | expectedEllipseWidth | expectedEllipseHeight
    ${'top'}         | ${120} | ${40}  | ${141.21}        | ${88.79}         | ${40}                | ${60}
    ${'topRight'}    | ${360} | ${40}  | ${174.38}        | ${0.43}          | ${6.67}              | ${100}
    ${'right'}       | ${360} | ${120} | ${110.74}        | ${94.07}         | ${6.67}              | ${40}
    ${'bottomRight'} | ${360} | ${280} | ${146.09}        | ${68.72}         | ${6.67}              | ${20}
    ${'bottom'}      | ${120} | ${280} | ${133.97}        | ${125.78}        | ${40}                | ${0.5}
    ${'bottomLeft'}  | ${0}   | ${280} | ${118.85}        | ${114}           | ${46.67}             | ${0.5}
    ${'left'}        | ${0}   | ${120} | ${44.41}         | ${61.07}         | ${73.33}             | ${40}
    ${'topLeft'}     | ${0}   | ${40}  | ${29.29}         | ${49.29}         | ${80}                | ${40}
  `(
    'should computeResizing() of a rotated ellipse when dragging handle $name',
    ({
      name,
      dragX,
      dragY,
      expectedEllipseX,
      expectedEllipseY,
      expectedEllipseWidth,
      expectedEllipseHeight,
    }) => {
      const event = {
        deltaX: 0,
        deltaY: 0,
        lockAspectRatio: false,
        x: 0,
        y: 0,
      };
      const gridCellSize = 20;

      const ellipse: ShapeElement = mockEllipseElement({
        position: { x: 120, y: 120 },
        width: 40,
        height: 40,
        rotation: 45,
      });

      const result = computeResizing(
        { name, containerWidth: 120, containerHeight: 80 },
        { ...event, x: dragX, y: dragY },
        viewportWidth,
        viewportHeight,
        false,
        gridCellSize,
        {
          x: 120,
          y: 120,
          width: 120,
          height: 80,
          elements: { ellipse },
        },
      );

      expect(result).toMatchObject([
        {
          elementId: 'ellipse',
          elementOverride: {
            position: {
              x: expect.closeTo(expectedEllipseX),
              y: expect.closeTo(expectedEllipseY),
            },
            width: expect.closeTo(expectedEllipseWidth),
            height: expect.closeTo(expectedEllipseHeight),
            points: undefined,
          },
        },
      ]);
    },
  );

  it('should verify pointResizerUnrotatedFactory()', () => {
    const dimensions: Dimensions = {
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    };

    const resizableProperties: ResizableProperties = {
      x: 0,
      y: 0,
      height: 20,
      width: 20,
      elements: { a: mockEllipseElement({ rotation: 45 }) },
    };

    const fn = pointResizerUnrotatedFactory(dimensions, resizableProperties);

    expect(fn({ x: 10, y: 10 })).toMatchObject({
      x: expect.closeTo(5),
      y: expect.closeTo(5),
    });
  });

  it('should verify pointResizerRotatedFactory()', () => {
    const dimensions: Dimensions = {
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    };

    const origCenter: Point = { x: 5, y: 5 };
    const angle = 45;
    const newCenter: Point = { x: 6, y: 6 };
    const error = { x: 1, y: 1 };

    const resizableProperties: ResizableProperties = {
      x: 0,
      y: 0,
      height: 20,
      width: 20,
      elements: { a: mockEllipseElement({ rotation: 45 }) },
    };

    const fn = pointResizerRotatedFactory({
      dimensions,
      resizableProperties,
      origCenter,
      angle,
      newCenter,
      error,
    });

    expect(fn({ x: 10, y: 10 })).toMatchObject({
      x: expect.closeTo(9.5),
      y: expect.closeTo(4.55),
    });
  });

  it('should verify resizeInfoRotated()', () => {
    const elementId = 'a';
    const element = mockEllipseElement({ rotation: 45 });
    const dimensions: Dimensions = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    };
    const resizableProperties: ResizableProperties = {
      x: 0,
      y: 0,
      height: 20,
      width: 20,
      elements: { a: element },
    };

    const { override, pointResizerRotated } = resizeInfoRotated(
      elementId,
      element,
      dimensions,
      resizableProperties,
    );

    expect(override).toMatchObject({
      elementId: 'a',
      elementOverride: {
        height: 500,
        width: 250,
        points: undefined,
        position: {
          x: expect.closeTo(-173.54),
          y: expect.closeTo(15.96),
        },
      },
    });

    expect(pointResizerRotated({ x: 10, y: 10 })).toMatchObject({
      x: expect.closeTo(-123.54),
      y: expect.closeTo(60.96),
    });
  });

  it('should verify computeResizingConnectingPathElement() for a line connected to a resized rotated ellipse', () => {
    const ellipseId = 'e';
    const ellipse = mockEllipseElement({ rotation: 45 });
    const lineId = 'l';
    const line = mockLineElement({
      connectedElementStart: ellipseId,
    });

    const elements: Elements = {
      [ellipseId]: ellipse,
    };

    const resizableProperties = {
      x: 0,
      y: 0,
      height: 20,
      width: 20,
    };

    const dimensions: Dimensions = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
    };

    const { pointResizerRotated } = resizeInfoRotated(
      ellipseId,
      ellipse,
      dimensions,
      { ...resizableProperties, elements: elements },
    );

    const resizers = {
      [ellipseId]: pointResizerRotated,
    };

    const result = computeResizingConnectingPathElement(
      {
        elementId: lineId,
        element: line,
      },
      elements,
      resizableProperties,
      dimensions,
      resizers,
    );

    expect(result).toMatchObject({
      elementId: lineId,
      elementOverride: {
        points: [
          { x: expect.closeTo(0), y: expect.closeTo(16.96) },
          { x: expect.closeTo(175.54), y: expect.closeTo(0) },
        ],
        position: { x: expect.closeTo(-173.54), y: expect.closeTo(4) },
      },
    });
  });
});
