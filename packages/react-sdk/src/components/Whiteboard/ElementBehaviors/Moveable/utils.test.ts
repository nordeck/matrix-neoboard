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

import { mockEllipseElement } from '../../../../lib/testUtils/documentTestUtils';
import { Elements } from '../../../../state/types';
import { calculateElementOverrideUpdates } from './utils';

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
        100,
        120,
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
        0,
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
        whiteboardWidth + 155,
        0,
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
        0,
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
        0,
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
