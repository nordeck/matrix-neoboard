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

import { describe, expect, it } from 'vitest';
import {
  mockEllipseElement,
  mockFrameElement,
  mockLineElement,
  mockRectangleElement,
} from '../../../lib/testUtils';
import {
  calculateBoundingRectForElements,
  calculateFittedElementSize,
  clampElementPosition,
  elementSchema,
  findFrameToAttach,
  includesTextShape,
  isShapeWithText,
  isTextShape,
  isValidElement,
} from './elements';

describe('isValidElement', () => {
  it.each(['line', 'polyline'])('should accept %j path event', (kind) => {
    const data = {
      type: 'path',
      position: { x: 1, y: 2 },
      kind,
      points: [],
      strokeColor: 'red',
    };

    expect(isValidElement(data)).toBe(true);
  });

  it.each([
    {
      connectedElementStart: 'element-id-1',
    },
    {
      connectedElementStart: 'element-id-1',
      connectedElementEnd: 'element-id-2',
    },
    {
      connectedElementEnd: 'element-id-2',
    },
  ])(
    'should accept path element with connections',
    ({ connectedElementStart, connectedElementEnd }) => {
      const data = {
        type: 'path',
        position: { x: 1, y: 2 },
        kind: 'line',
        points: [],
        strokeColor: 'red',
        connectedElementStart,
        connectedElementEnd,
      };

      expect(isValidElement(data)).toBe(true);
    },
  );

  it.each(['line', 'polyline'])(
    'should accept %j path element with attached frame',
    (kind) => {
      const data = {
        type: 'path',
        position: { x: 1, y: 2 },
        kind: kind,
        points: [],
        strokeColor: 'red',
        attachedFrame: 'frame-id-0',
      };

      expect(isValidElement(data)).toBe(true);
    },
  );

  it('should accept additional properties for path event', () => {
    const data = {
      type: 'path',
      position: { x: 1, y: 2, additional: 'data' },
      kind: 'line',
      points: [{ x: 1, y: 2, additional: 'data' }],
      strokeColor: 'red',
      endMarker: 'arrow-head-line',
    };

    expect(isValidElement(data)).toBe(true);
  });

  it.each(['rectangle', 'circle', 'ellipse', 'triangle'])(
    'should accept %j shape event',
    (kind) => {
      const data = {
        type: 'shape',
        position: { x: 1, y: 2 },
        kind,
        width: 100,
        height: 100,
        fillColor: 'red',
        text: '',
        connectedPaths: ['element-id-1'],
      };

      expect(isValidElement(data)).toBe(true);
    },
  );

  it.each([
    {
      connectedPaths: undefined,
    },
    {
      connectedPaths: ['element-1'],
    },
  ])('should accept shape element with connections', ({ connectedPaths }) => {
    const data = {
      type: 'shape',
      position: { x: 1, y: 2 },
      kind: 'rectangle',
      width: 100,
      height: 100,
      fillColor: 'red',
      text: '',
      connectedPaths,
    };

    expect(isValidElement(data)).toBe(true);
  });

  it.each(['rectangle', 'circle', 'ellipse', 'triangle'])(
    'should accept %j shape event with attached frame',
    (kind) => {
      const data = {
        type: 'shape',
        position: { x: 1, y: 2 },
        kind,
        width: 100,
        height: 100,
        fillColor: 'red',
        text: '',
        attachedFrame: 'frame-id-0',
      };

      expect(isValidElement(data)).toBe(true);
    },
  );

  it('should accept additional properties for shape event', () => {
    const data = {
      type: 'shape',
      position: { x: 1, y: 2, additional: 'data' },
      kind: 'rectangle',
      width: 100,
      height: 100,
      fillColor: 'red',
      strokeColor: 'green',
      strokeWidth: 2,
      text: 'some text',
      textAlignment: 'center',
      textColor: '#ffffff',
      textBold: false,
      textItalic: true,
      additional: 'data',
    };

    expect(isValidElement(data)).toBe(true);
  });

  it('should accept frame element', () => {
    const data = {
      type: 'frame',
      position: { x: 1, y: 2 },
      width: 100,
      height: 100,
    };

    expect(isValidElement(data)).toBe(true);
  });

  it('should accept frame element with attached elements', () => {
    const data = {
      type: 'frame',
      position: { x: 1, y: 2 },
      width: 100,
      height: 100,
      attachedElements: ['element-id-0', 'element-id-1'],
    };

    expect(isValidElement(data)).toBe(true);
  });

  it('should accept additional properties for frame element', () => {
    const data = {
      type: 'frame',
      position: { x: 1, y: 2, additional: 'data' },
      width: 100,
      height: 100,
    };

    expect(isValidElement(data)).toBe(true);
  });

  it.each<object>([
    { type: undefined },
    { type: null },
    { type: 111 },
    { type: '' },
    { position: undefined },
    { position: null },
    { position: 111 },
    { position: {} },
    { kind: undefined },
    { kind: null },
    { kind: 111 },
    { kind: 'other' },
    { points: undefined },
    { points: null },
    { points: 111 },
    { points: [{}] },
    { strokeColor: undefined },
    { strokeColor: null },
    { strokeColor: 111 },
    { strokeColor: '' },
    { startMarker: null },
    { startMarker: 111 },
    { startMarker: '' },
    { startMarker: 'square' },
    { endMarker: null },
    { endMarker: 111 },
    { endMarker: '' },
    { endMarker: 'triangle' },
    { connectedElementStart: 111 },
    { connectedElementStart: null },
    { connectedElementStart: '' },
    { connectedElementStart: '__proto__' },
    { connectedElementStart: 'constructor' },
    { connectedElementEnd: 111 },
    { connectedElementEnd: null },
    { connectedElementEnd: '' },
    { connectedElementEnd: '__proto__' },
    { connectedElementEnd: 'constructor' },
    { attachedFrame: 111 },
    { attachedFrame: null },
    { attachedFrame: '' },
    { attachedFrame: '__proto__' },
    { attachedFrame: 'constructor' },
  ])('should reject path event with patch %j', (patch: object) => {
    const data = {
      type: 'path',
      position: { x: 1, y: 2 },
      kind: 'line',
      points: [],
      strokeColor: 'red',
      ...patch,
    };

    expect(isValidElement(data)).toBe(false);
  });

  it.each<object>([
    { type: undefined },
    { type: null },
    { type: 111 },
    { type: '' },
    { position: undefined },
    { position: null },
    { position: 111 },
    { position: {} },
    { kind: undefined },
    { kind: null },
    { kind: 111 },
    { kind: 'other' },
    { width: '111' },
    { height: '111' },
    { fillColor: undefined },
    { fillColor: null },
    { fillColor: 111 },
    { strokeColor: null },
    { strokeColor: 111 },
    { strokeWidth: null },
    { strokeWidth: '2' },
    { text: undefined },
    { text: null },
    { text: 111 },
    { textAlignment: null },
    { textAlignment: 111 },
    { textAlignment: 'other' },
    { textColor: null },
    { textColor: 111 },
    { textBold: null },
    { textBold: 111 },
    { textBold: 'other' },
    { textItalic: null },
    { textItalic: 111 },
    { textItalic: 'other' },
    { connectedPaths: 111 },
    { connectedPaths: null },
    { connectedPaths: [{}] },
    { connectedPaths: [null] },
    { connectedPaths: [111] },
    { connectedPaths: ['__proto__'] },
    { connectedPaths: ['constructor'] },
    { attachedFrame: 111 },
    { attachedFrame: null },
    { attachedFrame: '' },
    { attachedFrame: '__proto__' },
    { attachedFrame: 'constructor' },
  ])('should reject shape event with patch %j', (patch: object) => {
    const data = {
      type: 'shape',
      position: { x: 1, y: 2 },
      kind: 'rectangle',
      width: 100,
      height: 100,
      fillColor: 'red',
      text: '',
      ...patch,
    };

    expect(isValidElement(data)).toBe(false);
  });

  it.each<object>([
    { type: undefined },
    { type: null },
    { type: 111 },
    { type: '' },
    { position: undefined },
    { position: null },
    { position: 111 },
    { position: {} },
    { width: '111' },
    { height: '111' },
    { attachedElements: null },
    { attachedElements: '111' },
    { attachedElements: [{}] },
    { attachedElements: [111] },
    { attachedElements: ['__proto__'] },
    { attachedElements: ['constructor'] },
  ])('should reject frame event with patch %j', (patch: object) => {
    const data = {
      type: 'frame',
      position: { x: 1, y: 2 },
      width: 100,
      height: 100,
      ...patch,
    };

    expect(isValidElement(data)).toBe(false);
  });

  it.each(['', 'mxc://example.com/test1234'])(
    'should accept valid image elements with MXC "%s"',
    (mxc) => {
      const data = {
        type: 'image',
        mxc,
        fileName: 'example.jpg',
        mimeType: 'image/jpeg',
        position: { x: 10, y: 20 },
        width: 100,
        height: 100,
      };

      expect(isValidElement(data)).toBe(true);
    },
  );

  it('should accept image with attached frame', () => {
    const data = {
      type: 'image',
      mxc: 'mxc://example.com/test1234',
      fileName: 'example.jpg',
      mimeType: 'image/jpeg',
      position: { x: 10, y: 20 },
      width: 100,
      height: 100,
      attachedFrame: 'frame-id-0',
    };

    expect(isValidElement(data)).toBe(true);
  });

  it.each<object>([
    { type: undefined },
    { type: null },
    { type: 111 },
    { type: '' },
    { mxc: undefined },
    { mxc: null },
    { mxc: '111' },
    { mxc: 'http://example.com/example.jpg' },
    { mxc: 'https://example.com/example.jpg' },
    { mxc: 'example.jpg' },
    { fileName: undefined },
    { fileName: null },
    { mimeType: 'application/pdf' },
    { position: undefined },
    { position: null },
    { position: 111 },
    { position: {} },
    { width: '111' },
    { height: '111' },
    { attachedFrame: 111 },
    { attachedFrame: null },
    { attachedFrame: '' },
    { attachedFrame: '__proto__' },
    { attachedFrame: 'constructor' },
  ])('should reject an image event with patch %j', (patch: object) => {
    const data = {
      type: 'image',
      mxc: 'mxc://example.com/test1234',
      fileName: 'example.jpg',
      position: { x: 10, y: 20 },
      width: 100,
      height: 100,
      ...patch,
    };

    expect(isValidElement(data)).toBe(false);
  });

  it.each<object>([
    { width: null, height: null },
    { width: undefined, height: undefined },
    { width: '', height: '' },
    { width: 0, height: 0 },
  ])(
    'should use default shape values for width and height',
    (patch: object) => {
      const data = {
        type: 'shape',
        kind: 'rectangle',
        position: { x: 10, y: 20 },
        ...patch,
      };

      const result = elementSchema.validate(data);
      expect(result.value.width).toBe(1);
      expect(result.value.height).toBe(1);
    },
  );

  it.each<object>([
    { width: null, height: null },
    { width: undefined, height: undefined },
    { width: '', height: '' },
    { width: 0, height: 0 },
  ])(
    'should use default image values for width and height',
    (patch: object) => {
      const data = {
        type: 'image',
        mxc: 'mxc://example.com/test1234',
        fileName: 'example.jpg',
        position: { x: 10, y: 20 },
        ...patch,
      };

      const result = elementSchema.validate(data);
      expect(result.value.width).toBe(1);
      expect(result.value.height).toBe(1);
    },
  );
});

describe('calculateBoundingRectForElements', () => {
  it('should calculate the bounding rect for an array of elements with single shape element', () => {
    const elements = [mockEllipseElement()];
    expect(calculateBoundingRectForElements(elements)).toEqual({
      offsetX: 0,
      offsetY: 1,
      width: 50,
      height: 100,
    });
  });

  it('should calculate the bounding rect for an array of elements with single path element', () => {
    const elements = [mockLineElement()];
    expect(calculateBoundingRectForElements(elements)).toEqual({
      offsetX: 0,
      offsetY: 1,
      width: 2,
      height: 2,
    });
  });

  it('should calculate the bounding rect for an array of elements', () => {
    const elements = [
      mockEllipseElement({ width: 2, height: 5 }),
      mockLineElement({
        position: { x: 10, y: 0 },
        points: [
          { x: 0, y: 0 },
          { x: 2, y: 2 },
        ],
      }),
    ];
    expect(calculateBoundingRectForElements(elements)).toEqual({
      offsetX: 0,
      offsetY: 0,
      width: 12,
      height: 6,
    });
  });

  it('should calculate the bounding rect for empty array', () => {
    expect(calculateBoundingRectForElements([])).toEqual({
      offsetX: 0,
      offsetY: 0,
      width: 0,
      height: 0,
    });
  });
});

describe('calculateFittedElementSize', () => {
  it('should return 0, 0 if everything is 0', () => {
    expect(
      calculateFittedElementSize(
        { width: 0, height: 0 },
        { width: 0, height: 0 },
      ),
    ).toEqual({
      width: 0,
      height: 0,
    });
  });

  it('should not change the size if the element already fits into the container', () => {
    expect(
      calculateFittedElementSize(
        { width: 20, height: 10 },
        { width: 100, height: 50 },
      ),
    ).toEqual({ width: 20, height: 10 });
  });

  it('should fit the element into the container if they both have the same aspect ratio', () => {
    expect(
      calculateFittedElementSize(
        { width: 100, height: 50 },
        { width: 20, height: 10 },
      ),
    ).toEqual({ width: 20, height: 10 });
  });

  it('should fit the element if it is wider than the container while keeping the aspect ratio', () => {
    expect(
      calculateFittedElementSize(
        { width: 40, height: 50 },
        { width: 20, height: 100 },
      ),
    ).toEqual({ width: 20, height: 25 });
  });

  it('should fit the element if it is higher than the container while keeping the aspect ratio', () => {
    expect(
      calculateFittedElementSize(
        { width: 40, height: 50 },
        { width: 100, height: 25 },
      ),
    ).toEqual({ width: 20, height: 25 });
  });
});

describe('clampElementPosition', () => {
  it('should not change position if element fits into container', () => {
    expect(
      clampElementPosition(
        { x: 10, y: 10 },
        { width: 20, height: 20 },
        { width: 100, height: 100 },
      ),
    ).toEqual({
      x: 10,
      y: 10,
    });
  });

  it('should clamp to top left corner', () => {
    expect(
      clampElementPosition(
        { x: -10, y: -10 },
        { width: 20, height: 20 },
        { width: 100, height: 100 },
      ),
    ).toEqual({
      x: 0,
      y: 0,
    });
  });

  it('should clamp to bottom right corner', () => {
    expect(
      clampElementPosition(
        { x: 95, y: 95 },
        { width: 20, height: 20 },
        { width: 100, height: 100 },
      ),
    ).toEqual({
      x: 79,
      y: 79,
    });
  });
});

it.each([
  ['shape', '', '', false],
  ['shape', '#ff0000', '', false],
  ['shape', '', 'hello', false],
  ['shape', 'transparent', 'hello', false],
  ['shape', '#ff0000', 'hello', true],
] as [string, string, string, boolean][])(
  'isShapeWithText (kind %s, fillColor %s, text %s) should return %s',
  (elementType, fillColor, text, expected) => {
    const element =
      elementType === 'shape'
        ? mockRectangleElement({ fillColor, text })
        : mockLineElement();
    expect(isShapeWithText(element)).toBe(expected);
  },
);

it.each([
  ['shape', '', '', false],
  ['shape', '#ff0000', '', false],
  ['shape', 'transparent', '', false],
  ['shape', '', 'hello', true],
  ['shape', 'transparent', 'hello', true],
  ['shape', '#ff0000', 'hello', false],
] as [string, string, string, boolean][])(
  'isTextShape (kind %s, fillColor %s, text %s) should return %s',
  (elementType, fillColor, text, expected) => {
    const element =
      elementType === 'shape'
        ? mockRectangleElement({ fillColor, text })
        : mockLineElement();
    expect(isTextShape(element)).toBe(expected);
  },
);

describe('includesShapeWithText', () => {
  it('should return false for an empty list', () => {
    expect(includesTextShape([])).toBe(false);
  });

  it('should return false if there are only non-text elements', () => {
    expect(
      includesTextShape([
        mockLineElement(),
        mockRectangleElement({ fillColor: '#ff0000', text: 'hello' }),
      ]),
    ).toBe(false);
  });

  it('should return true if there is one text element', () => {
    expect(
      includesTextShape([
        mockLineElement(),
        mockRectangleElement({ fillColor: 'transparent', text: 'hello' }),
      ]),
    ).toBe(true);
  });
});

describe('includesTextShape', () => {
  it('should return false for an empty list', () => {
    expect(includesTextShape([])).toBe(false);
  });

  it('should return false if there are only non-text shape elements', () => {
    expect(
      includesTextShape([
        mockLineElement(),
        mockRectangleElement({ fillColor: '#ff0000' }),
      ]),
    ).toBe(false);
  });

  it('should return true if there is one text shape element', () => {
    expect(
      includesTextShape([
        mockLineElement(),
        mockRectangleElement({ fillColor: '#ff0000' }),
        mockRectangleElement({ fillColor: '#ff0000', text: 'hello' }),
      ]),
    ).toBe(false);
  });
});

describe('findFrameToAttach', () => {
  it('should find frame if element top left and bottom right corners are within the frame', () => {
    expect(
      findFrameToAttach(mockRectangleElement(), {
        'frame-id-0': mockFrameElement({
          position: { x: 0, y: 1 },
          width: 50,
          height: 100,
        }),
      }),
    ).toEqual('frame-id-0');
  });

  it('should not find frame if element top left is not within the frame', () => {
    expect(
      findFrameToAttach(mockRectangleElement(), {
        'frame-id-0': mockFrameElement({
          position: { x: 1, y: 1 },
          width: 50,
          height: 100,
        }),
      }),
    ).toBeUndefined();
  });

  it('should not find frame if element bottom right corner is not within the frame', () => {
    expect(
      findFrameToAttach(mockRectangleElement(), {
        'frame-id-0': mockFrameElement({
          position: { x: 1, y: 1 },
          width: 50,
          height: 50,
        }),
      }),
    ).toBeUndefined();
  });

  it('should find frame if path element top left and bottom right corners are within the frame', () => {
    expect(
      findFrameToAttach(
        mockLineElement({
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 100 },
          ],
        }),
        {
          'frame-id-0': mockFrameElement({
            position: { x: 0, y: 1 },
            width: 50,
            height: 100,
          }),
        },
      ),
    ).toEqual('frame-id-0');
  });

  it('should not find frame if path element bottom right corner is not within the frame', () => {
    expect(
      findFrameToAttach(
        mockLineElement({
          position: { x: 1, y: 1 },
          points: [
            { x: 0, y: 0 },
            { x: 50, y: 100 },
          ],
        }),
        {
          'frame-id-0': mockFrameElement({
            position: { x: 1, y: 1 },
            width: 50,
            height: 50,
          }),
        },
      ),
    ).toBeUndefined();
  });

  it('should find last frame if several frames match', () => {
    expect(
      findFrameToAttach(mockRectangleElement(), {
        'frame-id-0': mockFrameElement({
          position: { x: 0, y: 1 },
          width: 50,
          height: 100,
        }),
        'frame-id-1': mockFrameElement({
          position: { x: 0, y: 1 },
          width: 100,
          height: 200,
        }),
      }),
    ).toEqual('frame-id-1');
  });

  it('should find no frame', () => {
    expect(findFrameToAttach(mockRectangleElement(), {})).toBeUndefined();
  });
});
