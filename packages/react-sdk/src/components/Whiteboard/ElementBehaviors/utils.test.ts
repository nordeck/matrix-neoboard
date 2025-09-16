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

import { beforeEach, describe, expect, it } from 'vitest';
import {
  mockEllipseElement,
  mockFrameElement,
  mockLineElement,
  mockRectangleElement,
  mockTriangleElement,
} from '../../../lib/testUtils';
import {
  Element,
  Elements,
  FrameElement,
  PathElement,
  WhiteboardSlideInstance,
} from '../../../state';
import { ElementOverrideUpdate } from '../../ElementOverridesProvider';
import {
  elementsUpdates,
  findAttachedElementsMovedByFrame,
  findElementAttachFrame,
  findElementFrameChanges,
  lineResizeUpdates,
} from './utils';

describe('lineResizeUpdates', () => {
  let slideElements: Elements;
  let slideInstance: WhiteboardSlideInstance;
  let frameElements: Elements<FrameElement>;

  beforeEach(() => {
    slideElements = {
      'rectangle-id': mockRectangleElement({
        position: { x: 100, y: 100 },
        width: 200,
        height: 200,
      }),
      'line-id-1': mockLineElement({
        position: { x: 500, y: 500 },
        points: [
          { x: 0, y: 0 },
          { x: 200, y: 200 },
        ],
      }),
      'frame-0': mockFrameElement({
        position: { x: 500, y: 500 },
        width: 300,
        height: 300,
      }),
    };

    frameElements = {
      'frame-0': mockFrameElement({
        position: { x: 500, y: 500 },
        width: 300,
        height: 300,
      }),
    };

    slideInstance = {
      getElement(elementId: string): Element | undefined {
        return slideElements[elementId];
      },
      getFrameElements(): Elements<FrameElement> {
        return frameElements;
      },
    } as WhiteboardSlideInstance;
  });

  it('should provide updates when line is resized', () => {
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

  it('should provide updates when line is resized to connection point', () => {
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
        undefined,
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

  it('should provide updates when line is resized to connection point but shape is not found', () => {
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
        'rectangle-id-other',
        undefined,
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
        },
      },
    ]);
  });

  it('should provide updates when line is resized by connected position', () => {
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
        { x: 500, y: 500 },
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
        undefined,
      ),
    ).toStrictEqual([
      {
        elementId: 'line-id-1',
        patch: {
          position: { x: 200, y: 200 },
          points: [
            { x: 0, y: 0 },
            { x: 500, y: 500 },
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

  it('should provide updates when line is resized by connected position to connection point of another shape', () => {
    slideElements = {
      ['rectangle-id']: mockRectangleElement({
        position: { x: 100, y: 100 },
        width: 200,
        height: 200,
        connectedPaths: ['line-id-1'],
      }),
      ['rectangle-id-2']: mockRectangleElement({
        position: { x: 200, y: 200 },
        width: 200,
        height: 200,
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
        { x: 500, y: 500 },
      ],
      connectedElementStart: 'rectangle-id',
    });
    expect(
      lineResizeUpdates(
        slideInstance,
        'line-id-1',
        element,
        'start',
        'rectangle-id-2',
        undefined,
      ),
    ).toStrictEqual([
      {
        elementId: 'line-id-1',
        patch: {
          position: { x: 200, y: 200 },
          points: [
            { x: 0, y: 0 },
            { x: 500, y: 500 },
          ],
          connectedElementStart: 'rectangle-id-2',
        },
      },
      {
        elementId: 'rectangle-id-2',
        patch: {
          connectedPaths: ['line-id-1'],
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

  it('should provide updates when line is resized by connected position to connection point of the same shape', () => {
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
      position: { x: 100, y: 100 },
      points: [
        { x: 0, y: 0 },
        { x: 600, y: 600 },
      ],
      connectedElementStart: 'rectangle-id',
    });
    expect(
      lineResizeUpdates(
        slideInstance,
        'line-id-1',
        element,
        'start',
        'rectangle-id',
        undefined,
      ),
    ).toStrictEqual([
      {
        elementId: 'line-id-1',
        patch: {
          position: { x: 100, y: 100 },
          points: [
            { x: 0, y: 0 },
            { x: 600, y: 600 },
          ],
        },
      },
    ]);
  });

  it('should provide updates when connected line is resized to connection point of the same connected shape using not connected position', () => {
    slideElements = {
      ['rectangle-id']: mockRectangleElement({
        position: { x: 100, y: 100 },
        width: 200,
        height: 200,
        connectedPaths: ['line-id-1'],
      }),
      ['line-id-1']: mockLineElement({
        position: { x: 100, y: 100 },
        points: [
          { x: 0, y: 0 },
          { x: 600, y: 600 },
        ],
        connectedElementStart: 'rectangle-id',
      }),
    };

    const element: PathElement = mockLineElement({
      position: { x: 100, y: 100 },
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
        'end',
        'rectangle-id',
        undefined,
      ),
    ).toStrictEqual([
      {
        elementId: 'line-id-1',
        patch: {
          position: { x: 100, y: 100 },
          points: [
            { x: 0, y: 0 },
            { x: 300, y: 300 },
          ],
          connectedElementEnd: 'rectangle-id',
        },
      },
      {
        elementId: 'rectangle-id',
        patch: {
          connectedPaths: ['line-id-1', 'line-id-1'],
        },
      },
    ]);
  });

  it('should provide updates when connected with both positions to same shape line is resized', () => {
    slideElements = {
      ['rectangle-id']: mockRectangleElement({
        position: { x: 100, y: 100 },
        width: 200,
        height: 200,
        connectedPaths: ['line-id-1', 'line-id-1'],
      }),
      ['line-id-1']: mockLineElement({
        position: { x: 100, y: 100 },
        points: [
          { x: 0, y: 0 },
          { x: 300, y: 300 },
        ],
        connectedElementStart: 'rectangle-id',
        connectedElementEnd: 'rectangle-id',
      }),
    };

    const element: PathElement = mockLineElement({
      position: { x: 100, y: 100 },
      points: [
        { x: 0, y: 0 },
        { x: 600, y: 600 },
      ],
      connectedElementStart: 'rectangle-id',
      connectedElementEnd: 'rectangle-id',
    });
    expect(
      lineResizeUpdates(
        slideInstance,
        'line-id-1',
        element,
        'end',
        undefined,
        undefined,
      ),
    ).toStrictEqual([
      {
        elementId: 'line-id-1',
        patch: {
          position: { x: 100, y: 100 },
          points: [
            { x: 0, y: 0 },
            { x: 600, y: 600 },
          ],
          connectedElementEnd: undefined,
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

  it('should provide updates when connected with both positions to same shape line is resized to connection point of another shape', () => {
    slideElements = {
      ['rectangle-id']: mockRectangleElement({
        position: { x: 100, y: 100 },
        width: 200,
        height: 200,
        connectedPaths: ['line-id-1', 'line-id-1'],
      }),
      ['line-id-1']: mockLineElement({
        position: { x: 100, y: 100 },
        points: [
          { x: 0, y: 0 },
          { x: 300, y: 300 },
        ],
        connectedElementStart: 'rectangle-id',
        connectedElementEnd: 'rectangle-id',
      }),
      ['rectangle-id-2']: mockRectangleElement({
        position: { x: 200, y: 200 },
        width: 200,
        height: 200,
      }),
    };

    const element: PathElement = mockLineElement({
      position: { x: 100, y: 100 },
      points: [
        { x: 0, y: 0 },
        { x: 100, y: 100 },
      ],
      connectedElementStart: 'rectangle-id',
      connectedElementEnd: 'rectangle-id',
    });
    expect(
      lineResizeUpdates(
        slideInstance,
        'line-id-1',
        element,
        'end',
        'rectangle-id-2',
        undefined,
      ),
    ).toStrictEqual([
      {
        elementId: 'line-id-1',
        patch: {
          position: { x: 100, y: 100 },
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
          ],
          connectedElementEnd: 'rectangle-id-2',
        },
      },
      {
        elementId: 'rectangle-id-2',
        patch: {
          connectedPaths: ['line-id-1'],
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

  it('should provide updates when connected with both positions to same shape line is resized to connection point of the same shape', () => {
    slideElements = {
      ['rectangle-id']: mockRectangleElement({
        position: { x: 100, y: 100 },
        width: 200,
        height: 200,
        connectedPaths: ['line-id-1', 'line-id-1'],
      }),
      ['line-id-1']: mockLineElement({
        position: { x: 100, y: 100 },
        points: [
          { x: 0, y: 0 },
          { x: 300, y: 300 },
        ],
        connectedElementStart: 'rectangle-id',
        connectedElementEnd: 'rectangle-id',
      }),
    };

    const element: PathElement = mockLineElement({
      position: { x: 100, y: 100 },
      points: [
        { x: 0, y: 0 },
        { x: 0, y: 300 },
      ],
      connectedElementStart: 'rectangle-id',
      connectedElementEnd: 'rectangle-id',
    });
    expect(
      lineResizeUpdates(
        slideInstance,
        'line-id-1',
        element,
        'end',
        'rectangle-id',
        undefined,
      ),
    ).toStrictEqual([
      {
        elementId: 'line-id-1',
        patch: {
          position: { x: 100, y: 100 },
          points: [
            { x: 0, y: 0 },
            { x: 0, y: 300 },
          ],
        },
      },
    ]);
  });

  it('should provide updates when line is resized to be attached to the frame', () => {
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
        'frame-0',
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
          attachedFrame: 'frame-0',
        },
      },
      {
        elementId: 'frame-0',
        patch: {
          attachedElements: ['line-id-1'],
        },
      },
    ]);
  });

  it('should provide updates when line is resized to be attached to the frame and to connection point', () => {
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
        'frame-0',
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
          attachedFrame: 'frame-0',
        },
      },
      {
        elementId: 'rectangle-id',
        patch: {
          connectedPaths: ['line-id-1'],
        },
      },
      {
        elementId: 'frame-0',
        patch: {
          attachedElements: ['line-id-1'],
        },
      },
    ]);
  });

  it('should provide updates when line is resized to be detached from the frame', () => {
    frameElements = {
      'frame-0': mockFrameElement({
        position: { x: 500, y: 500 },
        width: 300,
        height: 300,
        attachedElements: ['line-id-1'],
      }),
    };

    const element: PathElement = mockLineElement({
      position: { x: 400, y: 400 },
      points: [
        { x: 0, y: 0 },
        { x: 300, y: 300 },
      ],
      attachedFrame: 'frame-0',
    });
    expect(
      lineResizeUpdates(
        slideInstance,
        'line-id-1',
        element,
        'start',
        undefined,
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
          attachedFrame: undefined,
        },
      },
      {
        elementId: 'frame-0',
        patch: {
          attachedElements: undefined,
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
      elementsUpdates(slideInstance, elements, elementOverrideUpdates, {}),
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

describe('findElementFrameChanges', () => {
  it('should find elements to frame changes', () => {
    expect(
      findElementFrameChanges(
        {
          'element-id-0': 'element-frame-id-1',
          'element-id-3': 'element-frame-id-3',
        },
        {
          'element-id-0': mockRectangleElement({
            attachedFrame: 'element-frame-id-0',
          }),
          'element-id-1': mockRectangleElement({
            attachedFrame: 'element-frame-id-2',
          }),
          'element-id-2': mockRectangleElement(),
          'element-id-3': mockRectangleElement(),
        },
      ),
    ).toEqual({
      'element-id-0': {
        oldFrameId: 'element-frame-id-0',
        newFrameId: 'element-frame-id-1',
      },
      'element-id-1': {
        oldFrameId: 'element-frame-id-2',
      },
      'element-id-3': {
        newFrameId: 'element-frame-id-3',
      },
    });
  });
});

describe('findElementAttachFrame', () => {
  it('should find element to be attached to frame', () => {
    expect(
      findElementAttachFrame(
        {
          'element-id-0': mockRectangleElement(),
          'element-id-1': mockRectangleElement({ width: 50, height: 50 }),
          'element-id-2': mockLineElement({
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 100 },
            ],
          }),
          'element-id-3': mockRectangleElement({
            position: { x: 100, y: 101 },
          }),
        },
        {
          'frame-id-0': mockFrameElement({
            position: { x: 0, y: 1 },
            width: 50,
            height: 100,
          }),
          'frame-id-1': mockFrameElement({
            position: { x: 100, y: 101 },
            width: 50,
            height: 100,
          }),
        },
      ),
    ).toEqual({
      'element-id-0': 'frame-id-0',
      'element-id-1': 'frame-id-0',
      'element-id-2': 'frame-id-0',
      'element-id-3': 'frame-id-1',
    });
  });

  it('should find another frame when attached element is moved to another frame', () => {
    expect(
      findElementAttachFrame(
        {
          'element-id-0': mockRectangleElement({
            position: { x: 100, y: 101 },
            attachedFrame: 'frame-id-0',
          }),
        },
        {
          'frame-id-0': mockFrameElement({
            position: { x: 0, y: 1 },
            width: 150,
            height: 200,
          }),
          'frame-id-1': mockFrameElement({
            position: { x: 100, y: 101 },
            width: 50,
            height: 100,
          }),
        },
      ),
    ).toEqual({
      'element-id-0': 'frame-id-1',
    });
  });

  it('should not find another frame when attached element is moved by the frame it is attached to', () => {
    const frame = mockFrameElement({
      position: { x: 0, y: 1 },
      width: 150,
      height: 200,
    });

    expect(
      findElementAttachFrame(
        {
          'element-id-0': mockRectangleElement({
            position: { x: 100, y: 101 },
            attachedFrame: 'frame-id-0',
          }),
          'frame-id-0': frame,
        },
        {
          'frame-id-0': frame,
          'frame-id-1': mockFrameElement({
            position: { x: 100, y: 101 },
            width: 50,
            height: 100,
          }),
        },
      ),
    ).toEqual({
      'element-id-0': 'frame-id-0',
    });
  });

  it('should not attach frame element to frame', () => {
    expect(
      findElementAttachFrame(
        {
          'element-id-0': mockRectangleElement(),
          'frame-element-id-1': mockFrameElement({
            position: { x: 0, y: 1 },
            width: 50,
            height: 50,
          }),
        },
        {
          'frame-id-0': mockFrameElement({
            position: { x: 0, y: 1 },
            width: 50,
            height: 100,
          }),
        },
      ),
    ).toEqual({
      'element-id-0': 'frame-id-0',
    });
  });

  it('should not attach path element with start element connected to another frame', () => {
    expect(
      findElementAttachFrame(
        {
          'element-id-0': mockRectangleElement(),
          'element-id-2': mockLineElement({
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 100 },
            ],
            connectedElementStart: 'element-id-3',
          }),
          'element-id-3': mockRectangleElement({
            position: { x: 100, y: 101 },
          }),
        },
        {
          'frame-id-0': mockFrameElement({
            position: { x: 0, y: 1 },
            width: 50,
            height: 100,
          }),
          'frame-id-1': mockFrameElement({
            position: { x: 100, y: 101 },
            width: 50,
            height: 100,
          }),
        },
      ),
    ).toEqual({
      'element-id-0': 'frame-id-0',
      'element-id-3': 'frame-id-1',
    });
  });

  it('should not attach path element with end element connected to another frame', () => {
    expect(
      findElementAttachFrame(
        {
          'element-id-0': mockRectangleElement(),
          'element-id-2': mockLineElement({
            points: [
              { x: 0, y: 0 },
              { x: 50, y: 100 },
            ],
            connectedElementEnd: 'element-id-3',
          }),
          'element-id-3': mockRectangleElement({
            position: { x: 100, y: 101 },
          }),
        },
        {
          'frame-id-0': mockFrameElement({
            position: { x: 0, y: 1 },
            width: 50,
            height: 100,
          }),
          'frame-id-1': mockFrameElement({
            position: { x: 100, y: 101 },
            width: 50,
            height: 100,
          }),
        },
      ),
    ).toEqual({
      'element-id-0': 'frame-id-0',
      'element-id-3': 'frame-id-1',
    });
  });
});

describe('findAttachedElementsMovedByFrame', () => {
  it('should find attached elements moved by the frame', () => {
    expect(
      findAttachedElementsMovedByFrame({
        'element-id-0': mockRectangleElement(),
        'element-id-1': mockRectangleElement({ attachedFrame: 'frame-id-0' }),
        'element-id-2': mockRectangleElement({ attachedFrame: 'frame-id-1' }),
        'element-id-3': mockLineElement({ attachedFrame: 'frame-id-0' }),
        'frame-id-0': mockFrameElement(),
      }),
    ).toEqual(['element-id-1', 'element-id-3']);
  });
});
