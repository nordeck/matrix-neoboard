/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

import { beforeEach, describe, expect, it } from 'vitest';
import {
  mockEllipseElement,
  mockLineElement,
  mockRectangleElement,
} from '../../../../lib/testUtils';
import { Elements } from '../../../../state';
import {
  calculateElementOverrideUpdates,
  snapToGridElementOverrideUpdates,
} from './utils';

describe('calculateElementOverrideUpdates', () => {
  const whiteboardWidth = 1920;
  const whiteboardHeight = 1080;

  let elements: Elements;

  beforeEach(() => {
    elements = {
      'element-1': mockEllipseElement({
        text: 'Element 1',
        position: { x: 20, y: 51 },
      }),
      'element-2': mockEllipseElement({
        text: 'Element 2',
        position: { x: 40, y: 251 },
      }),
    };
  });

  it('should calculate element override updates when moved', () => {
    expect(
      calculateElementOverrideUpdates(
        elements,
        120,
        171,
        whiteboardWidth,
        whiteboardHeight,
      ),
    ).toEqual([
      {
        elementId: 'element-1',
        elementOverride: {
          position: { x: 120, y: 171 },
        },
      },
      {
        elementId: 'element-2',
        elementOverride: {
          position: { x: 140, y: 371 },
        },
      },
    ]);
  });

  it('should keep elements within viewport when moved outside via left', () => {
    expect(
      calculateElementOverrideUpdates(
        elements,
        -155,
        51,
        whiteboardWidth,
        whiteboardHeight,
      ),
    ).toEqual([
      {
        elementId: 'element-1',
        elementOverride: {
          position: { x: 0, y: 51 },
        },
      },
      {
        elementId: 'element-2',
        elementOverride: {
          position: { x: 20, y: 251 },
        },
      },
    ]);
  });

  it('should keep elements within viewport when moved outside via right', () => {
    expect(
      calculateElementOverrideUpdates(
        elements,
        whiteboardWidth,
        51,
        whiteboardWidth,
        whiteboardHeight,
      ),
    ).toEqual([
      {
        elementId: 'element-1',
        elementOverride: {
          position: { x: whiteboardWidth - 50 - 1 - 20, y: 51 },
        },
      },
      {
        elementId: 'element-2',
        elementOverride: {
          position: { x: whiteboardWidth - 50 - 1, y: 251 },
        },
      },
    ]);
  });

  it('should keep elements within viewport when moved outside via top', () => {
    expect(
      calculateElementOverrideUpdates(
        elements,
        20,
        -155,
        whiteboardWidth,
        whiteboardHeight,
      ),
    ).toEqual([
      {
        elementId: 'element-1',
        elementOverride: {
          position: { x: 20, y: 0 },
        },
      },
      {
        elementId: 'element-2',
        elementOverride: {
          position: { x: 40, y: 200 },
        },
      },
    ]);
  });

  it('should keep elements within viewport when moved outside via bottom', () => {
    expect(
      calculateElementOverrideUpdates(
        elements,
        20,
        whiteboardHeight + 55,
        whiteboardWidth,
        whiteboardHeight,
      ),
    ).toEqual([
      {
        elementId: 'element-1',
        elementOverride: {
          position: { x: 20, y: whiteboardHeight - 100 - 1 - 200 },
        },
      },
      {
        elementId: 'element-2',
        elementOverride: {
          position: { x: 40, y: whiteboardHeight - 100 - 1 },
        },
      },
    ]);
  });
});

describe('snapToGridElementOverrideUpdates', () => {
  it('should snap to a grid a shape', () => {
    expect(
      snapToGridElementOverrideUpdates(
        [
          {
            elementId: 'rectangle-id-1',
            elementOverride: {
              position: {
                x: 35,
                y: 38,
              },
            },
          },
        ],
        {
          ['rectangle-id-1']: mockRectangleElement({
            position: { x: 35, y: 38 },
          }),
        },
        {},
      ),
    ).toStrictEqual([
      {
        elementId: 'rectangle-id-1',
        elementOverride: {
          position: {
            x: 40,
            y: 40,
          },
        },
      },
    ]);
  });

  it('should snap to a grid a line', () => {
    expect(
      snapToGridElementOverrideUpdates(
        [
          {
            elementId: 'line-id-1',
            elementOverride: {
              position: {
                x: 35,
                y: 38,
              },
            },
          },
        ],
        {
          ['line-id-1']: mockLineElement({
            position: { x: 35, y: 38 },
          }),
        },
        {},
      ),
    ).toStrictEqual([
      {
        elementId: 'line-id-1',
        elementOverride: {
          position: {
            x: 40,
            y: 40,
          },
        },
      },
    ]);
  });

  it('should snap to a grid a shape and a line', () => {
    expect(
      snapToGridElementOverrideUpdates(
        [
          {
            elementId: 'rectangle-id-1',
            elementOverride: {
              position: {
                x: 35,
                y: 38,
              },
            },
          },
          {
            elementId: 'line-id-1',
            elementOverride: {
              position: {
                x: 75,
                y: 38,
              },
            },
          },
        ],
        {
          ['rectangle-id-1']: mockRectangleElement({
            position: { x: 35, y: 38 },
          }),
          ['line-id-1']: mockLineElement({
            position: { x: 75, y: 38 },
          }),
        },
        {},
      ),
    ).toStrictEqual([
      {
        elementId: 'rectangle-id-1',
        elementOverride: {
          position: {
            x: 40,
            y: 40,
          },
        },
      },
      {
        elementId: 'line-id-1',
        elementOverride: {
          position: {
            x: 80,
            y: 40,
          },
        },
      },
    ]);
  });

  it('should snap to a grid a shape connected to a line', () => {
    expect(
      snapToGridElementOverrideUpdates(
        [
          {
            elementId: 'rectangle-id-1',
            elementOverride: {
              position: {
                x: 35,
                y: 38,
              },
            },
          },
          {
            elementId: 'line-id-1',
            elementOverride: {
              position: {
                x: 85,
                y: 138,
              },
              points: [
                { x: 0, y: 0 },
                { x: 50, y: 50 },
              ],
            },
          },
        ],
        {
          ['rectangle-id-1']: mockRectangleElement({
            position: { x: 35, y: 38 },
            connectedPaths: ['line-id-1'],
          }),
        },
        {
          ['line-id-1']: mockLineElement({
            position: { x: 60, y: 110 },
            points: [
              { x: 0, y: 0 },
              { x: 75, y: 78 },
            ],
            connectedElementStart: 'rectangle-id-1',
          }),
        },
      ),
    ).toStrictEqual([
      {
        elementId: 'rectangle-id-1',
        elementOverride: {
          position: {
            x: 40,
            y: 40,
          },
        },
      },
      {
        elementId: 'line-id-1',
        elementOverride: {
          position: {
            x: 90,
            y: 140,
          },
          points: [
            { x: 0, y: 0 },
            { x: 45, y: 48 },
          ],
        },
      },
    ]);
  });

  it('should snap to a grid a shape and line connected', () => {
    expect(
      snapToGridElementOverrideUpdates(
        [
          {
            elementId: 'rectangle-id-1',
            elementOverride: {
              position: {
                x: 35,
                y: 38,
              },
            },
          },
          {
            elementId: 'line-id-1',
            elementOverride: {
              position: {
                x: 85,
                y: 138,
              },
              points: [
                { x: 0, y: 0 },
                { x: 50, y: 50 },
              ],
            },
          },
        ],
        {
          ['rectangle-id-1']: mockRectangleElement({
            position: { x: 35, y: 38 },
            connectedPaths: ['line-id-1'],
          }),
          ['line-id-1']: mockLineElement({
            position: { x: 85, y: 138 },
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 50 },
            ],
            connectedElementStart: 'rectangle-id-1',
          }),
        },
        {},
      ),
    ).toStrictEqual([
      {
        elementId: 'rectangle-id-1',
        elementOverride: {
          position: {
            x: 40,
            y: 40,
          },
        },
      },
      {
        elementId: 'line-id-1',
        elementOverride: {
          position: {
            x: 90,
            y: 140,
          },
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 50 },
          ],
        },
      },
    ]);
  });

  it('should snap to a grid two shapes connected with line', () => {
    expect(
      snapToGridElementOverrideUpdates(
        [
          {
            elementId: 'rectangle-id-1',
            elementOverride: {
              position: {
                x: 35,
                y: 38,
              },
            },
          },
          {
            elementId: 'line-id-1',
            elementOverride: {
              position: {
                x: 85,
                y: 138,
              },
              points: [
                { x: 0, y: 0 },
                { x: 50, y: 50 },
              ],
            },
          },
          {
            elementId: 'rectangle-id-2',
            elementOverride: {
              position: {
                x: 135,
                y: 188,
              },
            },
          },
        ],
        {
          ['rectangle-id-1']: mockRectangleElement({
            position: { x: 35, y: 38 },
            connectedPaths: ['line-id-1'],
          }),
          ['rectangle-id-2']: mockRectangleElement({
            position: { x: 135, y: 188 },
            connectedPaths: ['line-id-1'],
          }),
        },
        {
          ['line-id-1']: mockLineElement({
            position: { x: 60, y: 110 },
            points: [
              { x: 0, y: 0 },
              { x: 75, y: 78 },
            ],
            connectedElementStart: 'rectangle-id-1',
            connectedElementEnd: 'rectangle-id-2',
          }),
        },
      ),
    ).toStrictEqual([
      {
        elementId: 'rectangle-id-1',
        elementOverride: {
          position: {
            x: 40,
            y: 40,
          },
        },
      },
      {
        elementId: 'line-id-1',
        elementOverride: {
          position: {
            x: 90,
            y: 140,
          },
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 40 },
          ],
        },
      },
      {
        elementId: 'rectangle-id-2',
        elementOverride: {
          position: {
            x: 140,
            y: 180,
          },
        },
      },
    ]);
  });

  it('should snap to a grid two shapes and line connecting these shapes', () => {
    expect(
      snapToGridElementOverrideUpdates(
        [
          {
            elementId: 'rectangle-id-1',
            elementOverride: {
              position: {
                x: 35,
                y: 38,
              },
            },
          },
          {
            elementId: 'line-id-1',
            elementOverride: {
              position: {
                x: 85,
                y: 138,
              },
              points: [
                { x: 0, y: 0 },
                { x: 50, y: 50 },
              ],
            },
          },
          {
            elementId: 'rectangle-id-2',
            elementOverride: {
              position: {
                x: 135,
                y: 188,
              },
            },
          },
        ],
        {
          ['rectangle-id-1']: mockRectangleElement({
            position: { x: 35, y: 38 },
            connectedPaths: ['line-id-1'],
          }),
          ['line-id-1']: mockLineElement({
            position: { x: 85, y: 138 },
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 50 },
            ],
            connectedElementStart: 'rectangle-id-1',
            connectedElementEnd: 'rectangle-id-2',
          }),
          ['rectangle-id-2']: mockRectangleElement({
            position: { x: 135, y: 188 },
            connectedPaths: ['line-id-1'],
          }),
        },
        {},
      ),
    ).toStrictEqual([
      {
        elementId: 'rectangle-id-1',
        elementOverride: {
          position: {
            x: 40,
            y: 40,
          },
        },
      },
      {
        elementId: 'line-id-1',
        elementOverride: {
          position: {
            x: 90,
            y: 140,
          },
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 40 },
          ],
        },
      },
      {
        elementId: 'rectangle-id-2',
        elementOverride: {
          position: {
            x: 140,
            y: 180,
          },
        },
      },
    ]);
  });
});
