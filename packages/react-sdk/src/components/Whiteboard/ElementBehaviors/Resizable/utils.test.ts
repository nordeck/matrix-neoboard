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
import { Element } from '../../../../state';
import { Dimensions } from './types';
import {
  calculateDimensions,
  calculateDragDimension,
  calculateDragOrigin,
  computeResizing,
} from './utils';

describe('calculateDragDimension', () => {
  it('should calculate the new dimension between drag origin and current cursor position', () => {
    expect(calculateDragDimension(10, 50)).toEqual({
      position: 10,
      size: 40,
      inverted: false,
    });
  });

  it('should calculate the new dimension if cursor is before the drag origin', () => {
    expect(calculateDragDimension(40, 10)).toEqual({
      position: 10,
      size: 30,
      inverted: true,
    });
  });

  it('should ensure a minimum size', () => {
    expect(calculateDragDimension(0, 1)).toEqual({
      position: 0,
      size: 1,
      inverted: false,
    });
  });

  it('should set upward size limit', () => {
    expect(calculateDragDimension(10, 50, 25, 30)).toEqual({
      position: 10,
      size: 30,
      inverted: false,
    });
  });

  it('should set downward size limit', () => {
    expect(calculateDragDimension(40, 10, 25, 30)).toEqual({
      position: 15,
      size: 25,
      inverted: true,
    });
  });
});

describe('calculateDragOrigin', () => {
  test.each`
    handlePosition   | expectedDragOriginX | expectedDragOriginY
    ${'top'}         | ${40}               | ${65}
    ${'topRight'}    | ${10}               | ${65}
    ${'right'}       | ${10}               | ${15}
    ${'bottomRight'} | ${10}               | ${15}
    ${'bottom'}      | ${10}               | ${15}
    ${'bottomLeft'}  | ${40}               | ${15}
    ${'left'}        | ${40}               | ${65}
    ${'topLeft'}     | ${40}               | ${65}
  `(
    'should calculate drag origin for $handlePosition based on start dimensions',
    ({ handlePosition, expectedDragOriginX, expectedDragOriginY }) => {
      const startDimension: Dimensions = {
        x: 10,
        y: 15,
        width: 30,
        height: 50,
      };
      expect(calculateDragOrigin(handlePosition, startDimension)).toEqual({
        dragOriginX: expectedDragOriginX,
        dragOriginY: expectedDragOriginY,
      });
    },
  );
});

describe('calculateDimensions', () => {
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
    ${'top'}         | ${25} | ${20} | ${15}     | ${20}     | ${20}         | ${50}
    ${'top'}         | ${25} | ${50} | ${15}     | ${50}     | ${20}         | ${20}
    ${'topRight'}    | ${25} | ${20} | ${15}     | ${20}     | ${10}         | ${50}
    ${'topRight'}    | ${25} | ${50} | ${15}     | ${50}     | ${10}         | ${20}
    ${'right'}       | ${45} | ${50} | ${15}     | ${30}     | ${30}         | ${40}
    ${'right'}       | ${5}  | ${50} | ${5}      | ${30}     | ${10}         | ${40}
    ${'bottomRight'} | ${45} | ${50} | ${15}     | ${30}     | ${30}         | ${20}
    ${'bottomRight'} | ${5}  | ${20} | ${5}      | ${20}     | ${10}         | ${10}
    ${'bottom'}      | ${15} | ${80} | ${15}     | ${30}     | ${20}         | ${50}
    ${'bottom'}      | ${15} | ${5}  | ${15}     | ${5}      | ${20}         | ${25}
    ${'bottomLeft'}  | ${30} | ${80} | ${30}     | ${30}     | ${5}          | ${50}
    ${'bottomLeft'}  | ${5}  | ${5}  | ${5}      | ${5}      | ${30}         | ${25}
    ${'left'}        | ${30} | ${40} | ${30}     | ${30}     | ${5}          | ${40}
    ${'left'}        | ${5}  | ${5}  | ${5}      | ${30}     | ${30}         | ${40}
    ${'topLeft'}     | ${25} | ${20} | ${25}     | ${20}     | ${10}         | ${50}
    ${'topLeft'}     | ${5}  | ${50} | ${5}      | ${50}     | ${30}         | ${20}
  `(
    'should calculate dimensions for drag at $position to $dragX,$dragY',
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
      expect(
        calculateDimensions(
          handlePosition,
          event,
          startDimension,
          viewportWidth,
          viewportHeight,
        ),
      ).toEqual({
        x: expectedX,
        y: expectedY,
        width: expectedWidth,
        height: expectedHeight,
      });
    },
  );

  test.each`
    handlePosition   | dragX | dragY | expectedX | expectedY | expectedWidth | expectedHeight
    ${'top'}         | ${25} | ${20} | ${15}     | ${20}     | ${20}         | ${50}
    ${'top'}         | ${25} | ${50} | ${15}     | ${50}     | ${20}         | ${20}
    ${'topRight'}    | ${25} | ${20} | ${15}     | ${20}     | ${10}         | ${50}
    ${'topRight'}    | ${25} | ${50} | ${15}     | ${50}     | ${10}         | ${20}
    ${'right'}       | ${45} | ${50} | ${15}     | ${30}     | ${30}         | ${40}
    ${'right'}       | ${5}  | ${50} | ${5}      | ${30}     | ${10}         | ${40}
    ${'bottomRight'} | ${45} | ${50} | ${15}     | ${30}     | ${30}         | ${20}
    ${'bottomRight'} | ${5}  | ${20} | ${5}      | ${20}     | ${10}         | ${10}
    ${'bottom'}      | ${15} | ${80} | ${15}     | ${30}     | ${20}         | ${50}
    ${'bottom'}      | ${15} | ${5}  | ${15}     | ${5}      | ${20}         | ${25}
    ${'bottomLeft'}  | ${30} | ${80} | ${30}     | ${30}     | ${5}          | ${50}
    ${'bottomLeft'}  | ${5}  | ${5}  | ${5}      | ${5}      | ${30}         | ${25}
    ${'left'}        | ${30} | ${40} | ${30}     | ${30}     | ${5}          | ${40}
    ${'left'}        | ${5}  | ${5}  | ${5}      | ${30}     | ${30}         | ${40}
    ${'topLeft'}     | ${25} | ${20} | ${25}     | ${20}     | ${10}         | ${50}
    ${'topLeft'}     | ${5}  | ${50} | ${5}      | ${50}     | ${30}         | ${20}
  `(
    'should calculate dimensions for drag at $position to $dragX,$dragY with inverted lock aspect ratio',
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
        lockAspectRatio: true,
        x: dragX,
        y: dragY,
      };
      expect(
        calculateDimensions(
          handlePosition,
          event,
          startDimension,
          viewportWidth,
          viewportHeight,
          true,
        ),
      ).toEqual({
        x: expectedX,
        y: expectedY,
        width: expectedWidth,
        height: expectedHeight,
      });
    },
  );

  test.each`
    handlePosition   | dragX  | dragY  | expectedX | expectedY | expectedWidth | expectedHeight
    ${'bottomRight'} | ${120} | ${40}  | ${15}     | ${30}     | ${85}         | ${10}
    ${'bottomRight'} | ${20}  | ${120} | ${15}     | ${30}     | ${5}          | ${80}
    ${'topLeft'}     | ${0}   | ${10}  | ${0}      | ${10}     | ${35}         | ${60}
    ${'topLeft'}     | ${10}  | ${0}   | ${10}     | ${0}      | ${25}         | ${70}
  `(
    'should keep dimensions for drag at $handlePosition to $dragX,$dragY inside of viewport bounds',
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
      expect(
        calculateDimensions(
          handlePosition,
          event,
          startDimension,
          viewportWidth,
          viewportHeight,
        ),
      ).toEqual({
        x: expectedX,
        y: expectedY,
        width: expectedWidth,
        height: expectedHeight,
      });
    },
  );

  it('should ensure a minimum size', () => {
    const event = {
      deltaX: 1,
      deltaY: 1,
      lockAspectRatio: false,
      x: 16,
      y: 31,
    };
    expect(
      calculateDimensions(
        'bottomRight',
        event,
        startDimension,
        viewportWidth,
        viewportHeight,
      ),
    ).toEqual({
      x: 15,
      y: 30,
      width: 1,
      height: 1,
    });
  });

  test.each`
    handlePosition   | dragX | dragY | expectedX | expectedY | expectedWidth | expectedHeight
    ${'top'}         | ${40} | ${20} | ${12.5}   | ${20}     | ${25}         | ${50}
    ${'top'}         | ${5}  | ${40} | ${17.5}   | ${40}     | ${15}         | ${30}
    ${'topRight'}    | ${40} | ${10} | ${15}     | ${20}     | ${25}         | ${50}
    ${'topRight'}    | ${5}  | ${30} | ${5}      | ${70}     | ${10}         | ${20}
    ${'right'}       | ${40} | ${20} | ${15}     | ${25}     | ${25}         | ${50}
    ${'right'}       | ${5}  | ${40} | ${5}      | ${40}     | ${10}         | ${20}
    ${'bottomRight'} | ${40} | ${20} | ${15}     | ${30}     | ${25}         | ${50}
    ${'bottomRight'} | ${5}  | ${40} | ${5}      | ${10}     | ${10}         | ${20}
    ${'bottom'}      | ${40} | ${20} | ${22.5}   | ${20}     | ${5}          | ${10}
    ${'bottom'}      | ${5}  | ${40} | ${22.5}   | ${30}     | ${5}          | ${10}
    ${'bottomLeft'}  | ${40} | ${20} | ${35}     | ${20}     | ${5}          | ${10}
    ${'bottomLeft'}  | ${5}  | ${40} | ${5}      | ${30}     | ${30}         | ${60}
    ${'left'}        | ${40} | ${20} | ${35}     | ${45}     | ${5}          | ${10}
    ${'left'}        | ${5}  | ${40} | ${5}      | ${20}     | ${30}         | ${60}
    ${'topLeft'}     | ${40} | ${10} | ${35}     | ${70}     | ${5}          | ${10}
    ${'topLeft'}     | ${5}  | ${30} | ${5}      | ${10}     | ${30}         | ${60}
  `(
    'should calculate dimensions for drag at $handlePosition to $dragX,$dragY with locked aspect ratio',
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
        lockAspectRatio: true,
        x: dragX,
        y: dragY,
      };
      expect(
        calculateDimensions(
          handlePosition,
          event,
          startDimension,
          viewportWidth,
          viewportHeight,
        ),
      ).toEqual({
        x: expectedX,
        y: expectedY,
        width: expectedWidth,
        height: expectedHeight,
      });
    },
  );

  test.each`
    handlePosition   | dragX  | dragY  | expectedX | expectedY | expectedWidth | expectedHeight
    ${'topRight'}    | ${100} | ${100} | ${15}     | ${0}      | ${35}         | ${70}
    ${'topRight'}    | ${0}   | ${0}   | ${0}      | ${70}     | ${15}         | ${30}
    ${'right'}       | ${100} | ${60}  | ${15}     | ${0}      | ${50}         | ${100}
    ${'right'}       | ${0}   | ${60}  | ${0}      | ${35}     | ${15}         | ${30}
    ${'bottomRight'} | ${100} | ${100} | ${15}     | ${30}     | ${40}         | ${80}
    ${'bottomRight'} | ${0}   | ${0}   | ${0}      | ${0}      | ${15}         | ${30}
    ${'bottomLeft'}  | ${100} | ${100} | ${35}     | ${0}      | ${15}         | ${30}
    ${'bottomLeft'}  | ${0}   | ${0}   | ${0}      | ${30}     | ${35}         | ${70}
    ${'left'}        | ${0}   | ${60}  | ${0}      | ${15}     | ${35}         | ${70}
    ${'left'}        | ${100} | ${60}  | ${35}     | ${0}      | ${50}         | ${100}
    ${'topLeft'}     | ${100} | ${100} | ${35}     | ${70}     | ${20}         | ${40}
    ${'topLeft'}     | ${0}   | ${0}   | ${0}      | ${0}      | ${35}         | ${70}
  `(
    'should not exceed viewport size while calculating dimensions for drag at $handlePosition to $dragX,$dragY with locked aspect ratio',
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
        lockAspectRatio: true,
        x: dragX,
        y: dragY,
      };
      expect(
        calculateDimensions(
          handlePosition,
          event,
          startDimension,
          viewportWidth,
          viewportHeight,
        ),
      ).toEqual({
        x: expectedX,
        y: expectedY,
        width: expectedWidth,
        height: expectedHeight,
      });
    },
  );

  test.each`
    handlePosition | dragX | dragY | expectedX | expectedY | expectedWidth | expectedHeight
    ${'top'}       | ${25} | ${20} | ${15}     | ${40}     | ${20}         | ${30}
    ${'top'}       | ${25} | ${50} | ${15}     | ${40}     | ${20}         | ${30}
    ${'right'}     | ${45} | ${50} | ${15}     | ${30}     | ${25}         | ${40}
    ${'right'}     | ${5}  | ${50} | ${0}      | ${30}     | ${15}         | ${40}
  `(
    'should snap to the grid while calculating dimensions for drag at $handlePosition to $dragX,$dragY',
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
      expect(
        calculateDimensions(
          handlePosition,
          event,
          startDimension,
          viewportWidth,
          viewportHeight,
          false,
          40,
        ),
      ).toEqual({
        x: expectedX,
        y: expectedY,
        width: expectedWidth,
        height: expectedHeight,
      });
    },
  );
});

describe('computeResizing', () => {
  const event = {
    deltaX: 0,
    deltaY: 0,
    lockAspectRatio: false,
    x: 0,
    y: 0,
  };

  const viewportWidth = 360;
  const viewportHeight = 360;
  const gridCellSize = 20;

  const line = mockLineElement({
    position: { x: 120, y: 160 },
    points: [
      { x: 0, y: 0 },
      { x: 120, y: 40 },
    ],
  });

  const ellipse: Element = mockEllipseElement({
    position: { x: 120, y: 120 },
    width: 40,
    height: 40,
  });

  it('should return no updates when resizableProperties are undefined', () => {
    expect(
      computeResizing(
        { name: 'top', containerWidth: 0, containerHeight: 0 },
        event,
        viewportWidth,
        viewportHeight,
        false,
        gridCellSize,
        undefined,
      ),
    ).toEqual([]);
  });

  test.each`
    name       | x      | y      | dragX  | dragY  | expectedX | expectedY
    ${'start'} | ${120} | ${160} | ${80}  | ${120} | ${80}     | ${120}
    ${'end'}   | ${240} | ${200} | ${280} | ${240} | ${120}    | ${160}
  `(
    'should compute resizing of line when dragging handle $name',
    ({ name, x, y, dragX, dragY, expectedX, expectedY }) => {
      expect(
        computeResizing(
          { name, x, y, elementId: 'element-id' },
          { ...event, x: dragX, y: dragY },
          viewportWidth,
          viewportHeight,
          false,
          gridCellSize,
          {
            x: 120,
            y: 160,
            width: 120,
            height: 40,
            elements: { line },
          },
        ),
      ).toEqual([
        {
          elementId: 'line',
          elementOverride: {
            position: { x: expectedX, y: expectedY },
            points: [
              { x: 0, y: 0 },
              { x: 160, y: 80 },
            ],
          },
        },
      ]);
    },
  );

  it('should not compute resizing of line', () => {
    expect(
      computeResizing(
        { name: 'start', x: 0, y: 0, elementId: 'element-id' },
        event,
        viewportWidth,
        viewportHeight,
        false,
        gridCellSize,
        {
          x: 120,
          y: 160,
          width: 120,
          height: 40,
          elements: { ellipse },
        },
      ),
    ).toEqual([]);
  });

  test.each`
    name             | dragX  | dragY  | expectedX | expectedY | expectedWidth | expectedHeight
    ${'top'}         | ${120} | ${80}  | ${120}    | ${80}     | ${40}         | ${80}
    ${'topRight'}    | ${200} | ${80}  | ${120}    | ${80}     | ${80}         | ${80}
    ${'right'}       | ${200} | ${120} | ${120}    | ${120}    | ${80}         | ${40}
    ${'bottomRight'} | ${200} | ${200} | ${120}    | ${120}    | ${80}         | ${80}
    ${'bottom'}      | ${120} | ${200} | ${120}    | ${120}    | ${40}         | ${80}
    ${'bottomLeft'}  | ${80}  | ${200} | ${80}     | ${120}    | ${80}         | ${80}
    ${'left'}        | ${80}  | ${120} | ${80}     | ${120}    | ${80}         | ${40}
    ${'topLeft'}     | ${80}  | ${80}  | ${80}     | ${80}     | ${80}         | ${80}
  `(
    'should compute resizing of shape when dragging handle $name',
    ({
      name,
      dragX,
      dragY,
      expectedX,
      expectedY,
      expectedWidth,
      expectedHeight,
    }) => {
      expect(
        computeResizing(
          { name, containerWidth: 40, containerHeight: 40 },
          { ...event, x: dragX, y: dragY },
          viewportWidth,
          viewportHeight,
          false,
          gridCellSize,
          {
            x: 120,
            y: 120,
            width: 40,
            height: 40,
            elements: { ellipse },
          },
        ),
      ).toEqual([
        {
          elementId: 'ellipse',
          elementOverride: {
            position: { x: expectedX, y: expectedY },
            width: expectedWidth,
            height: expectedHeight,
            points: undefined,
          },
        },
      ]);
    },
  );

  test.each`
    name             | dragX  | dragY  | expectedEllipseX | expectedEllipseY | expectedEllipseWidth | expectedEllipseHeight | expectedLineX | expectedLineY | expectedLineWidth | expectedLineHeight
    ${'top'}         | ${120} | ${40}  | ${120}           | ${40}            | ${40}                | ${80}                 | ${120}        | ${120}        | ${120}            | ${80}
    ${'topRight'}    | ${360} | ${40}  | ${120}           | ${40}            | ${80}                | ${80}                 | ${120}        | ${120}        | ${240}            | ${80}
    ${'right'}       | ${360} | ${120} | ${120}           | ${120}           | ${80}                | ${40}                 | ${120}        | ${160}        | ${240}            | ${40}
    ${'bottomRight'} | ${360} | ${280} | ${120}           | ${120}           | ${80}                | ${80}                 | ${120}        | ${200}        | ${240}            | ${80}
    ${'bottom'}      | ${120} | ${280} | ${120}           | ${120}           | ${40}                | ${80}                 | ${120}        | ${200}        | ${120}            | ${80}
    ${'bottomLeft'}  | ${0}   | ${280} | ${0}             | ${120}           | ${80}                | ${80}                 | ${0}          | ${200}        | ${240}            | ${80}
    ${'left'}        | ${0}   | ${120} | ${0}             | ${120}           | ${80}                | ${40}                 | ${0}          | ${160}        | ${240}            | ${40}
    ${'topLeft'}     | ${0}   | ${40}  | ${0}             | ${40}            | ${80}                | ${80}                 | ${0}          | ${120}        | ${240}            | ${80}
  `(
    'should compute resizing of elements when dragging handle $name',
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
      expect(
        computeResizing(
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
        ),
      ).toEqual([
        {
          elementId: 'ellipse',
          elementOverride: {
            position: { x: expectedEllipseX, y: expectedEllipseY },
            width: expectedEllipseWidth,
            height: expectedEllipseHeight,
            points: undefined,
          },
        },
        {
          elementId: 'line',
          elementOverride: {
            position: { x: expectedLineX, y: expectedLineY },
            width: undefined,
            height: undefined,
            points: [
              { x: 0, y: 0 },
              { x: expectedLineWidth, y: expectedLineHeight },
            ],
          },
        },
      ]);
    },
  );
});
