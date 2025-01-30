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
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockEllipseElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { createWhiteboardPdfDefinition } from './createWhiteboardPdfDefinition';
import * as font from './forceLoadFontFamily';

describe('createWhiteboardPdfDefinition', () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
      () => ({
        width: 100,
        height: 100,
        x: 0,
        y: 0,
        bottom: 0,
        left: 0,
        right: 0,
        top: 0,
        toJSON: vi.fn(),
      }),
    );
  });

  it('should generate a pdf header and table', async () => {
    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            [
              'element-rectangle',
              mockEllipseElement({
                kind: 'rectangle',
                text: 'Rectangle',
                textFontFamily: 'Inter',
              }),
            ],
            [
              'element-rectangle-text',
              mockEllipseElement({
                kind: 'rectangle',
                text: 'Rectangle Text',
                fillColor: 'transparent',
                textFontFamily: 'Inter',
              }),
            ],
            [
              'element-circle',
              mockEllipseElement({
                kind: 'circle',
                text: 'Circle ✅',
                textAlignment: 'right',
                textFontFamily: 'Inter',
              }),
            ],
            [
              'element-ellipse',
              mockEllipseElement({
                kind: 'ellipse',
                text: 'Ellipse',
                textFontFamily: 'Inter',
              }),
            ],
            [
              'element-triangle',
              mockEllipseElement({
                kind: 'triangle',
                text: 'Triangle 👍',
                textFontFamily: 'Inter',
              }),
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
        themePaletteErrorMain: '#d51928',
      }),
    ).toMatchSnapshot();
  });

  it('should load "Noto Emoji"', async () => {
    const spy = vi.spyOn(font, 'forceLoadFontFamily');

    const { whiteboardManager } = mockWhiteboardManager();
    const whiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

    await createWhiteboardPdfDefinition({
      whiteboardInstance,
      roomName: 'My Room',
      authorName: 'Alice',
      widgetApi: mockWidgetApi(),
      themePaletteErrorMain: '#d51928',
    });

    expect(spy).toHaveBeenCalledWith('Noto Emoji');
  });
});
