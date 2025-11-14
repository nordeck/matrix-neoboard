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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ImageUploadResult,
  ImageUploadState,
} from '../../components/ImageUpload/ImageUploadProvider';
import * as constants from '../../components/Whiteboard/constants';
import {
  mockEllipseElement,
  mockImageElement,
  mockRectangleElement,
  mockWhiteboardManager,
} from '../../lib/testUtils';
import { Element } from '../crdt';
import { WhiteboardDocumentExport } from '../export';
import { WhiteboardInstance } from '../types';
import { importWhiteboard } from './importWhiteboard';

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

describe('importWhiteboard', () => {
  const handleDrop = vi.fn<ImageUploadState['handleDrop']>();
  let whiteboard: WhiteboardInstance;

  beforeEach(() => {
    vi.mocked(getEnvironment).mockImplementation(
      (_, defaultValue) => defaultValue,
    );

    // Implement handleDrop to return a result depending on the filename
    handleDrop.mockImplementation((files) => {
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
    handleDrop.mockReset();
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

  it('should import whiteboard slides to frames in infinite canvas mode', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
    vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

    const data: WhiteboardDocumentExport = {
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [
          {
            elements: [mockRectangleElement()],
          },
          {
            elements: [mockEllipseElement()],
          },
        ],
      },
    };
    await importWhiteboard(whiteboard, data, handleDrop);

    const slideIds = whiteboard.getSlideIds();
    expect(slideIds.length).toBe(1);

    const slide = whiteboard.getSlide(slideIds[0]);
    expect(slide.getElementIds().length).toEqual(4);

    const frameIds = Object.keys(slide.getFrameElements());
    expect(frameIds.length).toBe(2);

    const [firstFrameId, secondFrameId] = frameIds;

    const elementIds = slide.getElementIds();
    expect(elementIds.length).toBe(4);
    const [elementId1, elementId2, elementId3, elementId4] = elementIds;

    expect(firstFrameId).toEqual(elementId1);
    expect(secondFrameId).toEqual(elementId3);

    expect(slide.getElement(firstFrameId)).toEqual({
      type: 'frame',
      position: { x: 7670, y: 4860 },
      width: 1920,
      height: 1080,
      attachedElements: [elementId2],
    });
    expect(slide.getElement(elementId2)).toEqual({
      ...mockRectangleElement({
        position: { x: 7670, y: 4861 },
      }),
      attachedFrame: firstFrameId,
    });

    expect(slide.getElement(secondFrameId)).toEqual({
      type: 'frame',
      position: { x: 9610, y: 4860 },
      width: 1920,
      height: 1080,
      attachedElements: [elementId4],
    });
    expect(slide.getElement(elementId4)).toEqual({
      ...mockEllipseElement({
        position: { x: 9610, y: 4861 },
      }),
      attachedFrame: secondFrameId,
    });
  });
});

function extractElements(whiteboard: WhiteboardInstance): Element[] {
  const slides = whiteboard
    .getSlideIds()
    .map(whiteboard.getSlide.bind(whiteboard));
  expect(slides.length).toBe(1);
  return Object.values(slides[0].getElements(slides[0].getElementIds()));
}
