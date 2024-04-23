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

import {
  mockEllipseElement,
  mockLineElement,
} from '../../../lib/testUtils/documentTestUtils';
import {
  calculateBoundingRectForElements,
  calculateCentredPosition,
  calculateFittedElementSize,
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
      additional: 'data',
    };

    expect(isValidElement(data)).toBe(true);
  });

  it.each<Object>([
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
    { endMarker: null },
    { endMarker: 111 },
    { endMarker: '' },
    { endMarker: 'triangle' },
  ])('should reject path event with patch %j', (patch: Object) => {
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

  it.each<Object>([
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
    { width: undefined },
    { width: null },
    { width: '111' },
    { height: undefined },
    { height: null },
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
    { textAlignment: null },
    { textAlignment: 111 },
  ])('should reject shape event with patch %j', (patch: Object) => {
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

  it('should accept a valid image element', () => {
    const data = {
      type: 'image',
      mxc: 'mxc://example.com/test1234',
      fileName: 'example.jpg',
      position: { x: 10, y: 20 },
      width: 100,
      height: 100,
    };

    expect(isValidElement(data)).toBe(true);
  });

  it.each<Object>([
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
    { position: undefined },
    { position: null },
    { position: 111 },
    { position: {} },
    { width: undefined },
    { width: null },
    { width: '111' },
    { height: undefined },
    { height: null },
    { height: '111' },
  ])('should reject an image event with patch %j', (patch: Object) => {
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

describe('calculateCentredPosition', () => {
  it('should return 0, 0 if everything is 0', () => {
    expect(
      calculateCentredPosition(
        { width: 0, height: 0 },
        { width: 0, height: 0 },
      ),
    ).toEqual({ x: 0, y: 0 });
  });

  it('should return 0, 0 if the element and the container have the same size', () => {
    expect(
      calculateCentredPosition(
        { width: 100, height: 50 },
        { width: 100, height: 50 },
      ),
    ).toEqual({ x: 0, y: 0 });
  });

  it('should calculate the centred position if the element is smaller than the container', () => {
    expect(
      calculateCentredPosition(
        { width: 20, height: 10 },
        { width: 100, height: 50 },
      ),
    ).toEqual({ x: 40, y: 20 });
  });

  it('should calculate the centred position if the element is larger than the container', () => {
    expect(
      calculateCentredPosition(
        { width: 100, height: 50 },
        { width: 20, height: 10 },
      ),
    ).toEqual({ x: -40, y: -20 });
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
