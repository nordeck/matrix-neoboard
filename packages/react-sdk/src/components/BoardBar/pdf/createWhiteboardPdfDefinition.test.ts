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

import { mockWidgetApi } from '@matrix-widget-toolkit/testing';
import {
  mockEllipseElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { createWhiteboardPdfDefinition } from './createWhiteboardPdfDefinition';
import * as font from './forceLoadFontFamily';

jest.mock('./forceLoadFontFamily', () => {
  return {
    __esModule: true,
    ...jest.requireActual('./forceLoadFontFamily'),
  };
});

describe('createWhiteboardPdfDefinition', () => {
  beforeEach(() => {
    jest
      .spyOn(Element.prototype, 'getBoundingClientRect')
      .mockImplementation(() => ({
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        toJSON: jest.fn(),
      }));
  });

  it('should generate a pdf header and table', async () => {
    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            [
              'element-rectangle',
              mockEllipseElement({ kind: 'rectangle', text: 'Rectangle' }),
            ],
            [
              'element-rectangle-text',
              mockEllipseElement({
                kind: 'rectangle',
                text: 'Rectangle Text',
                fillColor: 'transparent',
              }),
            ],
            [
              'element-circle',
              mockEllipseElement({
                kind: 'circle',
                text: 'Circle ✅',
                textAlignment: 'right',
              }),
            ],
            [
              'element-ellipse',
              mockEllipseElement({ kind: 'ellipse', text: 'Ellipse' }),
            ],
            [
              'element-triangle',
              mockEllipseElement({ kind: 'triangle', text: 'Triangle 👍' }),
            ],
          ],
        ],
        [
          'slide-1',
          [
            ['element-line', mockLineElement({ kind: 'line' })],
            ['element-polyline', mockLineElement({ kind: 'polyline' })],
          ],
        ],
      ],
    });
    const whiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

    expect(
      await createWhiteboardPdfDefinition({
        whiteboardInstance,
        roomName: 'My Room',
        authorName: 'Alice',
        widgetApi: mockWidgetApi(),
      }),
    ).toMatchSnapshot();
  });

  it('should load "Noto Emoji"', async () => {
    const spy = jest.spyOn(font, 'forceLoadFontFamily');

    const { whiteboardManager } = mockWhiteboardManager();
    const whiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

    await createWhiteboardPdfDefinition({
      whiteboardInstance,
      roomName: 'My Room',
      authorName: 'Alice',
      widgetApi: mockWidgetApi(),
    });

    expect(spy).toHaveBeenCalledWith('Noto Emoji');
  });
});
