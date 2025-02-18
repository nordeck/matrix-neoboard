/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

import { beforeAll, describe, expect, it } from 'vitest';
import {
  mockEllipseElement,
  mockLineElement,
  mockRectangleElement,
  mockTriangleElement,
} from '../../../lib/testUtils';
import {
  Element,
  Elements,
  PathElement,
  WhiteboardSlideInstance,
} from '../../../state';
import { ElementOverrideUpdate } from '../../ElementOverridesProvider';
import { elementsUpdates, lineResizeUpdates } from './utils';

describe('lineResizeUpdates', () => {
  let slideElements: Elements;
  let slideInstance: WhiteboardSlideInstance;

  beforeAll(() => {
    slideElements = {
      ['rectangle-id']: mockRectangleElement({
        position: { x: 100, y: 100 },
        width: 200,
        height: 200,
      }),
      ['line-id-1']: mockLineElement({
        position: { x: 500, y: 500 },
        points: [
          { x: 0, y: 0 },
          { x: 200, y: 200 },
        ],
      }),
    };

    slideInstance = {
      getElement(elementId: string): Element | undefined {
        return slideElements[elementId];
      },
    } as WhiteboardSlideInstance;
  });

  it('should provide updates when line is resized and no connection point', () => {
    const element: PathElement = mockLineElement({
      position: { x: 400, y: 400 },
      points: [
        { x: 0, y: 0 },
        { x: 300, y: 300 },
      ],
    });
    expect(
      lineResizeUpdates(
        slideInstance,
        'line-id-1',
        element,
        'start',
        undefined,
      ),
    ).toStrictEqual([
      {
        elementId: 'line-id-1',
        patch: {
          position: { x: 400, y: 400 },
          points: [
            { x: 0, y: 0 },
            { x: 300, y: 300 },
          ],
        },
      },
    ]);
  });

  it('should provide updates when line is resized and has connection point', () => {
    const element: PathElement = mockLineElement({
      position: { x: 300, y: 300 },
      points: [
        { x: 0, y: 0 },
        { x: 400, y: 400 },
      ],
    });
    expect(
      lineResizeUpdates(
        slideInstance,
        'line-id-1',
        element,
        'start',
        'rectangle-id',
      ),
    ).toStrictEqual([
      {
        elementId: 'line-id-1',
        patch: {
          position: { x: 300, y: 300 },
          points: [
            { x: 0, y: 0 },
            { x: 400, y: 400 },
          ],
          connectedElementStart: 'rectangle-id',
        },
      },
      {
        elementId: 'rectangle-id',
        patch: {
          connectedPaths: ['line-id-1'],
        },
      },
    ]);
  });

  it('should provide updates when line is resized and no connection point but line and shape are connected', () => {
    slideElements = {
      ['rectangle-id']: mockRectangleElement({
        position: { x: 100, y: 100 },
        width: 200,
        height: 200,
        connectedPaths: ['line-id-1'],
      }),
      ['line-id-1']: mockLineElement({
        position: { x: 300, y: 300 },
        points: [
          { x: 0, y: 0 },
          { x: 400, y: 400 },
        ],
        connectedElementStart: 'rectangle-id',
      }),
    };

    const element: PathElement = mockLineElement({
      position: { x: 200, y: 200 },
      points: [
        { x: 0, y: 0 },
        { x: 300, y: 300 },
      ],
      connectedElementStart: 'rectangle-id',
    });
    expect(
      lineResizeUpdates(
        slideInstance,
        'line-id-1',
        element,
        'start',
        undefined,
      ),
    ).toStrictEqual([
      {
        elementId: 'line-id-1',
        patch: {
          position: { x: 200, y: 200 },
          points: [
            { x: 0, y: 0 },
            { x: 300, y: 300 },
          ],
          connectedElementStart: undefined,
        },
      },
      {
        elementId: 'rectangle-id',
        patch: {
          connectedPaths: undefined,
        },
      },
    ]);
  });
});

describe('elementsUpdates', () => {
  it('should provide elements updates', () => {
    const slideElements: Elements = {
      ['rectangle-id']: mockRectangleElement({
        position: { x: 100, y: 100 },
        width: 200,
        height: 200,
        connectedPaths: ['line-id-1', 'line-id-2'],
      }),
      ['ellipse-id']: mockEllipseElement({
        position: { x: 100, y: 500 },
        width: 200,
        height: 200,
        connectedPaths: ['line-id-1'],
      }),
      ['triangle-id']: mockTriangleElement({
        position: { x: 500, y: 500 },
        width: 200,
        height: 200,
        connectedPaths: ['line-id-2'],
      }),
      ['line-id-1']: mockLineElement({
        position: { x: 100, y: 300 },
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 200 },
        ],
        connectedElementStart: 'rectangle-id',
        connectedElementEnd: 'ellipse-id',
      }),
      ['line-id-2']: mockLineElement({
        position: { x: 300, y: 300 },
        points: [
          { x: 0, y: 0 },
          { x: 300, y: 200 },
        ],
        connectedElementStart: 'rectangle-id',
        connectedElementEnd: 'triangle-id',
      }),
    };

    // move rectangle and first line to the right 200 px, prepare arguments

    const elements: Elements = {
      ['rectangle-id']: mockRectangleElement({
        position: { x: 300, y: 100 },
        width: 200,
        height: 200,
        connectedPaths: ['line-id-1', 'line-id-2'],
      }),
      ['line-id-1']: mockLineElement({
        position: { x: 300, y: 300 },
        points: [
          { x: 0, y: 0 },
          { x: 100, y: 200 },
        ],
        connectedElementStart: 'rectangle-id',
        connectedElementEnd: 'ellipse-id',
      }),
    };

    const elementOverrideUpdates: ElementOverrideUpdate[] = [
      {
        elementId: 'rectangle-id',
        elementOverride: {
          position: { x: 300, y: 100 },
        },
      },
      {
        elementId: 'line-id-1',
        elementOverride: {
          position: { x: 300, y: 300 },
        },
      },
      {
        elementId: 'line-id-2',
        elementOverride: {
          position: { x: 500, y: 300 },
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 200 },
          ],
        },
      },
    ];

    const slideInstance: WhiteboardSlideInstance = {
      getElement(elementId: string): Element | undefined {
        return slideElements[elementId];
      },
    } as WhiteboardSlideInstance;

    expect(
      elementsUpdates(slideInstance, elements, elementOverrideUpdates),
    ).toStrictEqual([
      {
        elementId: 'rectangle-id',
        patch: {
          position: { x: 300, y: 100 },
        },
      },
      {
        elementId: 'line-id-1',
        patch: {
          position: { x: 300, y: 300 },
          connectedElementEnd: undefined,
        },
      },
      {
        elementId: 'line-id-2',
        patch: {
          position: { x: 500, y: 300 },
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 200 },
          ],
        },
      },
      {
        elementId: 'ellipse-id',
        patch: {
          connectedPaths: undefined,
        },
      },
    ]);
  });
});
