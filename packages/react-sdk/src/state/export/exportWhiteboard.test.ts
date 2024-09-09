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

import { mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FetchMock } from 'vitest-fetch-mock';
import * as lib from '../../lib';
import {
  mockEllipseElement,
  mockImageElement,
} from '../../lib/testUtils/documentTestUtils';
import {
  createWhiteboardDocument,
  generateAddElement,
  generateAddSlide,
  generateLockSlide,
  generateMoveElement,
  generateMoveSlide,
} from '../crdt';
import { exportWhiteboard } from './exportWhiteboard';

const fetch = global.fetch as FetchMock;

// mock convertBlobToBase64 because testing with FileReader is painful
vi.mock('../../lib', async () => ({
  ...(await vi.importActual<typeof import('../../lib')>('../../lib')),
  convertBlobToBase64: vi.fn(),
}));

const slide0 = 'IN4h74suMiIAK4AVMAdl_';

describe('convertWhiteboardToExportFormat', () => {
  afterEach(() => {
    fetch.mockReset();
  });

  it('should return slides in the correct order', async () => {
    const document = createWhiteboardDocument();

    document.performChange((doc) => {
      const [addSlide1, slide1] = generateAddSlide();
      addSlide1(doc);

      const [addSlide2, slide2] = generateAddSlide();
      addSlide2(doc);

      const moveSlide1ToFront = generateMoveSlide(slide1, 0);
      moveSlide1ToFront(doc);

      const [addElementToSlide0] = generateAddElement(
        slide0,
        mockEllipseElement({ kind: 'circle' }),
      );
      addElementToSlide0(doc);

      const [addElementToSlide1] = generateAddElement(
        slide1,
        mockEllipseElement({ kind: 'ellipse' }),
      );
      addElementToSlide1(doc);

      const [addElementToSlide2] = generateAddElement(
        slide2,
        mockEllipseElement({ kind: 'triangle' }),
      );
      addElementToSlide2(doc);
    });

    expect(await exportWhiteboard(document.getData(), mockWidgetApi())).toEqual(
      {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [
            { elements: [mockEllipseElement({ kind: 'ellipse' })] },
            { elements: [mockEllipseElement({ kind: 'circle' })] },
            { elements: [mockEllipseElement({ kind: 'triangle' })] },
          ],
        },
      },
    );
  });

  it('should export images', async () => {
    const document = createWhiteboardDocument();
    document.performChange((doc) => {
      const [addElement0] = generateAddElement(slide0, mockImageElement());
      addElement0(doc);
    });

    vi.spyOn(lib, 'convertBlobToBase64').mockImplementation(
      async (blob: Blob) => {
        const text = await readBlobAsText(blob);
        // ensure that the response data is passed into the function
        expect(text).toEqual('image content');
        return btoa('encoded image content');
      },
    );

    fetch.mockResponse((req) => {
      if (
        req.url ===
        'https://example.com/_matrix/media/v3/download/example.com/test1234'
      ) {
        return 'test image data';
      }
      return '';
    });

    expect(await exportWhiteboard(document.getData(), mockWidgetApi())).toEqual(
      {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [{ elements: [mockImageElement()] }],
          files: [
            // expect the file with base64 encoded content
            {
              data: btoa('encoded image content'),
              mxc: 'mxc://example.com/test1234',
            },
          ],
        },
      },
    );
  });

  it('should deduplicate exported images', async () => {
    const document = createWhiteboardDocument();
    // add the mock image element twice
    document.performChange((doc) => {
      const [addElement0] = generateAddElement(slide0, mockImageElement());
      addElement0(doc);
    });
    document.performChange((doc) => {
      const [addElement1] = generateAddElement(slide0, mockImageElement());
      addElement1(doc);
    });

    // expect only one download to happen
    fetch.mockResponse((req) => {
      if (
        req.url ===
        'https://example.com/_matrix/media/v3/download/example.com/test1234'
      ) {
        return 'test image data';
      }
      return '';
    });

    vi.spyOn(lib, 'convertBlobToBase64').mockImplementation(
      async (blob: Blob) => {
        const text = await readBlobAsText(blob);
        // ensure that the response data is passed into the function
        expect(text).toEqual('image content');
        return btoa('encoded image content');
      },
    );
    expect(await exportWhiteboard(document.getData(), mockWidgetApi())).toEqual(
      {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [{ elements: [mockImageElement(), mockImageElement()] }],
          files: [
            // expect one file in the exported data
            {
              data: btoa('encoded image content'),
              mxc: 'mxc://example.com/test1234',
            },
          ],
        },
      },
    );
  });

  it('should skip image downloads with errors', async () => {
    const document = createWhiteboardDocument();
    document.performChange((doc) => {
      const [addElement0] = generateAddElement(slide0, mockImageElement());
      addElement0(doc);

      const [addElement1] = generateAddElement(
        slide0,
        mockImageElement({
          mxc: 'mxc://example.com/test5678',
        }),
      );
      addElement1(doc);
    });

    fetch.mockResponse((req) => {
      // simulate 500 error for the first file
      if (
        req.url.includes('https://example.com/_matrix/media/') &&
        req.url.includes('/download/example.com/test1234')
      ) {
        return {
          status: 500,
          body: '{}',
        };
      }
      // let the FileReader raise an error for the second file
      if (
        req.url.includes('https://example.com/_matrix/media/') &&
        req.url.includes('/download/example.com/test5678')
      ) {
        return 'test image data';
      }
      return '';
    });
    vi.spyOn(lib, 'convertBlobToBase64').mockRejectedValue('test error');

    expect(await exportWhiteboard(document.getData(), mockWidgetApi())).toEqual(
      {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [
            {
              elements: [
                mockImageElement(),
                mockImageElement({ mxc: 'mxc://example.com/test5678' }),
              ],
            },
          ],
        },
      },
    );
  });

  it('should return elements in the correct order', async () => {
    const document = createWhiteboardDocument();

    document.performChange((doc) => {
      const [addElement0] = generateAddElement(
        slide0,
        mockEllipseElement({ kind: 'circle' }),
      );
      addElement0(doc);

      const [addElement1, element1] = generateAddElement(
        slide0,
        mockEllipseElement({ kind: 'ellipse' }),
      );
      addElement1(doc);

      const [addElement2] = generateAddElement(
        slide0,
        mockEllipseElement({ kind: 'triangle' }),
      );
      addElement2(doc);

      const moveElement1ToFront = generateMoveElement(slide0, element1, 2);
      moveElement1ToFront(doc);
    });

    expect(await exportWhiteboard(document.getData(), mockWidgetApi())).toEqual(
      {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [
            {
              elements: [
                mockEllipseElement({ kind: 'circle' }),
                mockEllipseElement({ kind: 'triangle' }),
                mockEllipseElement({ kind: 'ellipse' }),
              ],
            },
          ],
        },
      },
    );
  });

  it('should include the lock status of a slide', async () => {
    const document = createWhiteboardDocument();

    document.performChange((doc) => {
      const [addSlide1, slide1] = generateAddSlide();
      addSlide1(doc);

      const lockSlide1 = generateLockSlide(slide1, '@user-id');
      lockSlide1(doc);
    });

    expect(await exportWhiteboard(document.getData(), mockWidgetApi())).toEqual(
      {
        version: 'net.nordeck.whiteboard@v1',
        whiteboard: {
          slides: [{ elements: [] }, { elements: [], lock: {} }],
        },
      },
    );
  });
});

const readBlobAsText = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
};
