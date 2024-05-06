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

import fetchMock from 'fetch-mock-jest';
import { convertBlobToBase64 } from '../../lib';
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

// mock convertBlobToBase64 because testing with FileReader is painful
jest.mock('../../lib', () => ({
  ...jest.requireActual('../../lib'),
  convertBlobToBase64: jest.fn(),
}));

const slide0 = 'IN4h74suMiIAK4AVMAdl_';

describe('convertWhiteboardToExportFormat', () => {
  afterEach(() => {
    fetchMock.mockReset();
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

    expect(
      await exportWhiteboard(document.getData(), 'https://example.com'),
    ).toEqual({
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [
          { elements: [mockEllipseElement({ kind: 'ellipse' })] },
          { elements: [mockEllipseElement({ kind: 'circle' })] },
          { elements: [mockEllipseElement({ kind: 'triangle' })] },
        ],
      },
    });
  });

  it('should export images', async () => {
    const document = createWhiteboardDocument();
    document.performChange((doc) => {
      const [addElement0] = generateAddElement(slide0, mockImageElement());
      addElement0(doc);
    });

    fetchMock.get(
      'https://example.com/_matrix/media/v3/download/example.com/test1234',
      'test image data',
    );

    jest.mocked(convertBlobToBase64).mockImplementation(async (blob: Blob) => {
      // ensure that the response data is passed into the function
      expect(await blob.text()).toEqual('test image data');
      return btoa('encoded test image data');
    });

    expect(
      await exportWhiteboard(document.getData(), 'https://example.com'),
    ).toEqual({
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [{ elements: [mockImageElement()] }],
        files: [
          // expect the file with base64 encoded content
          {
            data: btoa('encoded test image data'),
            mxc: 'mxc://example.com/test1234',
          },
        ],
      },
    });
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
    fetchMock.get(
      'https://example.com/_matrix/media/v3/download/example.com/test1234',
      'test image data',
    );

    jest.mocked(convertBlobToBase64).mockImplementation(async (blob: Blob) => {
      // ensure that the response data is passed into the function
      expect(await blob.text()).toEqual('test image data');
      return btoa('encoded test image data');
    });

    expect(
      await exportWhiteboard(document.getData(), 'https://example.com'),
    ).toEqual({
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [{ elements: [mockImageElement(), mockImageElement()] }],
        files: [
          // expect one file in the exported data
          {
            data: btoa('encoded test image data'),
            mxc: 'mxc://example.com/test1234',
          },
        ],
      },
    });
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

    // simulate 500 error for the first file
    fetchMock.get(
      'https://example.com/_matrix/media/v3/download/example.com/test1234',
      {
        status: 500,
      },
    );

    // let the FileReader raise an error for the second file
    fetchMock.get(
      'https://example.com/_matrix/media/v3/download/example.com/test5678',
      'test image data',
    );
    jest.mocked(convertBlobToBase64).mockRejectedValue('test error');

    expect(
      await exportWhiteboard(document.getData(), 'https://example.com'),
    ).toEqual({
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
    });
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

    expect(
      await exportWhiteboard(document.getData(), 'https://example.com'),
    ).toEqual({
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
    });
  });

  it('should include the lock status of a slide', async () => {
    const document = createWhiteboardDocument();

    document.performChange((doc) => {
      const [addSlide1, slide1] = generateAddSlide();
      addSlide1(doc);

      const lockSlide1 = generateLockSlide(slide1, '@user-id');
      lockSlide1(doc);
    });

    expect(
      await exportWhiteboard(document.getData(), 'https://example.com'),
    ).toEqual({
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [{ elements: [] }, { elements: [], lock: {} }],
      },
    });
  });
});
