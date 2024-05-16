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

import {
  ImageUploadResult,
  ImageUploadState,
} from '../../components/ImageUpload/ImageUploadProvider';
import {
  mockImageElement,
  mockRectangleElement,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { Element } from '../crdt';
import { WhiteboardDocumentExport } from '../export';
import { WhiteboardInstance } from '../types';
import { importWhiteboard } from './importWhiteboard';

describe('importWhiteboard', () => {
  const handleDrop: ImageUploadState['handleDrop'] = jest.fn();
  let whiteboard: WhiteboardInstance;

  beforeEach(() => {
    // Implement handleDrop to return a result depending on the filename
    jest.mocked(handleDrop).mockImplementation((files) => {
      const promises: Promise<ImageUploadResult>[] = [];

      for (const file of files) {
        if (file.name === 'example.jpg') {
          promises.push(
            Promise.resolve({
              fileName: file.name,
              size: { width: 100, height: 100 },
              mimeType: 'image/jpeg',
              mxc: 'mxc://example.com/jkl456',
            }),
          );
          continue;
        }

        if (file.name === 'error.jpg') {
          promises.push(Promise.reject('upload failed'));
          continue;
        }
      }

      return Promise.allSettled(promises);
    });
    whiteboard =
      mockWhiteboardManager().whiteboardManager.getActiveWhiteboardInstance()!;
  });

  afterEach(() => {
    jest.mocked(handleDrop).mockReset();
  });

  it('should import a whiteboard without images', async () => {
    const data: WhiteboardDocumentExport = {
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [
          {
            elements: [mockRectangleElement()],
          },
        ],
      },
    };
    await importWhiteboard(whiteboard, data, handleDrop);

    const elements = extractElements(whiteboard);
    expect(elements).toEqual([mockRectangleElement()]);
  });

  it('should import a whiteboard with images', async () => {
    const data: WhiteboardDocumentExport = {
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [
          {
            elements: [
              mockImageElement({
                fileName: 'example.jpg',
                mxc: 'mxc://example.com/asd123',
              }),
              mockRectangleElement(),
            ],
          },
        ],
        files: [{ mxc: 'mxc://example.com/asd123', data: 'data' }],
      },
    };
    await importWhiteboard(whiteboard, data, handleDrop);

    const elements = extractElements(whiteboard);
    expect(elements).toEqual([
      mockImageElement({
        fileName: 'example.jpg',
        mxc: 'mxc://example.com/jkl456',
      }),
      mockRectangleElement(),
    ]);
  });

  it('should clear the MXC URIs for images with errors', async () => {
    const data: WhiteboardDocumentExport = {
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [
          {
            elements: [
              mockImageElement({
                fileName: 'example.jpg',
                mxc: 'mxc://example.com/asd123',
              }),
              mockImageElement({ fileName: 'error.jpg' }),
              mockRectangleElement(),
            ],
          },
        ],
        files: [{ mxc: 'mxc://example.com/asd123', data: 'data' }],
      },
    };
    await importWhiteboard(whiteboard, data, handleDrop);

    const elements = extractElements(whiteboard);
    expect(elements).toEqual([
      mockImageElement({
        fileName: 'example.jpg',
        mxc: 'mxc://example.com/jkl456',
      }),
      mockImageElement({ fileName: 'error.jpg', mxc: '' }),
      mockRectangleElement(),
    ]);
  });
});

function extractElements(whiteboard: WhiteboardInstance): Element[] {
  const slides = whiteboard
    .getSlideIds()
    .map(whiteboard.getSlide.bind(whiteboard));
  expect(slides.length).toBe(1);
  return Object.values(slides[0].getElements(slides[0].getElementIds()));
}
