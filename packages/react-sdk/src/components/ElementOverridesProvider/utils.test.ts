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

import { describe, expect, it } from 'vitest';
import {
  mockEllipseElement,
  mockFrameElement,
  mockImageElement,
  mockPolylineElement,
} from '../../lib/testUtils';
import { mergeElementAndOverride } from './utils';

describe('mergeElementAndOverride', () => {
  it(`should replace position of shape element`, () => {
    const element = mockEllipseElement();
    expect(
      mergeElementAndOverride(element, { position: { x: 20, y: 21 } }),
    ).toEqual({
      ...element,
      position: { x: 20, y: 21 },
    });
  });

  it(`should replace width of shape element`, () => {
    const element = mockEllipseElement();
    expect(mergeElementAndOverride(element, { width: 100 })).toEqual({
      ...element,
      width: 100,
    });
  });

  it(`should replace height of shape element`, () => {
    const element = mockEllipseElement();
    expect(mergeElementAndOverride(element, { height: 101 })).toEqual({
      ...element,
      height: 101,
    });
  });

  it(`should replace rotation of shape element`, () => {
    const element = mockEllipseElement();
    expect(mergeElementAndOverride(element, { rotation: 45 })).toEqual({
      ...element,
      rotation: 45,
    });
  });

  it(`should replace position of image element`, () => {
    const element = mockImageElement();
    expect(
      mergeElementAndOverride(element, { position: { x: 20, y: 21 } }),
    ).toEqual({
      ...element,
      position: { x: 20, y: 21 },
    });
  });

  it(`should replace width of image element`, () => {
    const element = mockImageElement();
    expect(mergeElementAndOverride(element, { width: 100 })).toEqual({
      ...element,
      width: 100,
    });
  });

  it(`should replace height of image element`, () => {
    const element = mockImageElement();
    expect(mergeElementAndOverride(element, { height: 101 })).toEqual({
      ...element,
      height: 101,
    });
  });

  it(`should replace rotation of image element`, () => {
    const element = mockImageElement();
    expect(mergeElementAndOverride(element, { rotation: 45 })).toEqual({
      ...element,
      rotation: 45,
    });
  });

  it(`should replace position of path element`, () => {
    const element = mockPolylineElement();
    expect(
      mergeElementAndOverride(element, { position: { x: 20, y: 21 } }),
    ).toEqual({
      ...element,
      position: { x: 20, y: 21 },
    });
  });

  it(`should replace points of path element`, () => {
    const element = mockPolylineElement();
    expect(
      mergeElementAndOverride(element, {
        points: [
          { x: 0, y: 1 },
          { x: 2, y: 3 },
          { x: 4, y: 5 },
        ],
      }),
    ).toEqual({
      ...element,
      points: [
        { x: 0, y: 1 },
        { x: 2, y: 3 },
        { x: 4, y: 5 },
      ],
    });
  });

  it(`should not replace rotation of path element`, () => {
    const element = mockPolylineElement();
    expect(mergeElementAndOverride(element, { rotation: 45 })).toEqual(element);
  });

  it(`should replace position of frame element`, () => {
    const element = mockFrameElement();
    expect(
      mergeElementAndOverride(element, { position: { x: 20, y: 21 } }),
    ).toEqual({
      ...element,
      position: { x: 20, y: 21 },
    });
  });

  it(`should replace width of frame element`, () => {
    const element = mockFrameElement();
    expect(mergeElementAndOverride(element, { width: 100 })).toEqual({
      ...element,
      width: 100,
    });
  });

  it(`should replace height of frame element`, () => {
    const element = mockFrameElement();
    expect(mergeElementAndOverride(element, { height: 101 })).toEqual({
      ...element,
      height: 101,
    });
  });

  it(`should not replace rotation of frame element`, () => {
    const element = mockFrameElement();
    expect(mergeElementAndOverride(element, { rotation: 45 })).toEqual(element);
  });
});
