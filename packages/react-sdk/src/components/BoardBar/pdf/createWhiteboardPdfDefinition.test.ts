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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { Content, ContentStack } from 'pdfmake/interfaces';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockEllipseElement,
  mockFrameElement,
  mockLineElement,
  mockTextElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardInstance } from '../../../state';
import * as whiteboardConstants from '../../Whiteboard/constants';
import { createWhiteboardPdfDefinition } from './createWhiteboardPdfDefinition';
import * as font from './forceLoadFontFamily';

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

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

describe('PDF export in the Infinite Canvas mode', () => {
  let whiteboardInstance: WhiteboardInstance;

  beforeEach(() => {
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
                position: { x: 100, y: 100 },
              }),
            ],
            [
              'element-rectangle-text',
              mockEllipseElement({
                kind: 'rectangle',
                text: 'Rectangle Text',
                fillColor: 'transparent',
                textFontFamily: 'Inter',
                position: { x: 200, y: 200 },
              }),
            ],
            [
              'element-circle',
              mockEllipseElement({
                kind: 'circle',
                text: 'Circle ✅',
                textAlignment: 'right',
                textFontFamily: 'Inter',
                position: { x: 300, y: 300 },
              }),
            ],
            [
              'element-ellipse',
              mockEllipseElement({
                kind: 'ellipse',
                text: 'Ellipse',
                textFontFamily: 'Inter',
                position: { x: 400, y: 400 },
              }),
            ],
            [
              'element-triangle',
              mockEllipseElement({
                kind: 'triangle',
                text: 'Triangle 👍',
                textFontFamily: 'Inter',
                position: { x: 500, y: 500 },
              }),
            ],
          ],
        ],
      ],
    });
    whiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

    // Enable infinite canvas mode for this test
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );
    vi.spyOn(whiteboardConstants, 'infiniteCanvasMode', 'get').mockReturnValue(
      true,
    );
    vi.spyOn(whiteboardConstants, 'whiteboardWidth', 'get').mockReturnValue(
      19200,
    );
    vi.spyOn(whiteboardConstants, 'whiteboardHeight', 'get').mockReturnValue(
      10800,
    );
  });

  it(`should export a small visible area when there are no frames in the slide`, async () => {
    const d = await createWhiteboardPdfDefinition({
      whiteboardInstance,
      roomName: 'My Room',
      authorName: 'Alice',
      widgetApi: mockWidgetApi(),
      themePaletteErrorMain: '#d51928',
    });

    expect(d).toMatchObject({
      pageSize: {
        height: 500,
        width: 450,
      },
    });
  });

  it('should export each frame as a page', async () => {
    const activeSlide = whiteboardInstance.getSlide('slide-0');

    const textId = activeSlide.addElement(
      mockTextElement({
        position: { x: 600, y: 600 },
      }),
    );

    const frameId = activeSlide.addElement(
      mockFrameElement({
        position: { x: 500, y: 500 },
        width: 300,
        height: 300,
      }),
    );

    const textId2 = activeSlide.addElement(
      mockTextElement({
        position: { x: 1100, y: 1100 },
      }),
    );

    const frameId2 = activeSlide.addElement(
      mockFrameElement({
        position: { x: 1000, y: 1000 },
        width: 300,
        height: 700,
      }),
    );

    activeSlide.updateElements([
      {
        elementId: frameId,
        patch: {
          attachedElements: [textId],
        },
      },
      {
        elementId: textId,
        patch: {
          attachedFrame: frameId,
        },
      },
      {
        elementId: frameId2,
        patch: {
          attachedElements: [textId2],
        },
      },
      {
        elementId: textId2,
        patch: {
          attachedFrame: frameId2,
        },
      },
    ]);

    const d = await createWhiteboardPdfDefinition({
      whiteboardInstance,
      roomName: 'My Room',
      authorName: 'Alice',
      widgetApi: mockWidgetApi(),
      themePaletteErrorMain: '#d51928',
    });

    // page size check
    expect(d).toMatchObject({
      pageSize: {
        height: 700,
        width: 300,
      },
    });

    const { content } = d;

    // should be 2 pages
    expect((content as Content[]).length).toBe(2);

    // check that element coordinate system is local to the frame
    const stack = (content as ContentStack[])[0].stack as Content[];
    const textTable = ((stack[0] as Content[])[0] as Content[])[1];
    expect(textTable).toMatchObject({
      absolutePosition: {
        x: 110,
        y: 150,
      },
    });
  });
});
