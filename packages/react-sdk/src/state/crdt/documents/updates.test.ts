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
  mockRectangleElement,
} from '../../../lib/testUtils/documentTestUtils';
import {
  generateAddElement,
  generateAddSlide,
  getNormalizedElementIds,
  getNormalizedSlideIds,
} from './operations';
import { generateFramesUpdate } from './updates';
import {
  WhiteboardDocumentVersion,
  createWhiteboardDocument,
} from './whiteboardDocument';

// createWhiteboardDocument() always contains a slide with this id
const slide0 = 'IN4h74suMiIAK4AVMAdl_';

describe('generateFramesUpdate', () => {
  it('should update document from initial version with several slides to frames version', () => {
    const doc = createWhiteboardDocument(WhiteboardDocumentVersion.Initial);

    const element0 = mockRectangleElement();
    const [changeFn] = generateAddElement(slide0, element0);
    doc.performChange(changeFn);

    const [changeFn1, slide1] = generateAddSlide();
    doc.performChange(changeFn1);

    const element1 = mockEllipseElement();
    const [changeFn2] = generateAddElement(slide1, element1);
    doc.performChange(changeFn2);

    const doc1 = createWhiteboardDocument(WhiteboardDocumentVersion.Frames);
    const updateChangeFn = generateFramesUpdate(doc.getData());
    doc1.performChange(updateChangeFn);

    expect(getNormalizedSlideIds(doc1.getData())).toEqual([slide0]);
    const elementIds = getNormalizedElementIds(doc1.getData(), slide0);

    expect(elementIds).toHaveLength(4);

    const [slideElement0, slideElement1, slideElement2, slideElement3] =
      elementIds;

    // a frame for each slide with elements attached to frames
    expect(doc1.getData().toJSON()).toEqual({
      slideIds: [slide0],
      slides: {
        [slide0]: {
          elements: {
            [slideElement0]: {
              type: 'frame',
              position: { x: 7670, y: 4860 },
              width: 1920,
              height: 1080,
              attachedElements: [slideElement1],
            },
            [slideElement1]: {
              ...mockRectangleElement({
                position: { x: 7670, y: 4861 },
              }),
              attachedFrame: slideElement0,
            },
            [slideElement2]: {
              type: 'frame',
              position: { x: 9610, y: 4860 },
              width: 1920,
              height: 1080,
              attachedElements: [slideElement3],
            },
            [slideElement3]: {
              ...mockEllipseElement({
                position: { x: 9610, y: 4861 },
              }),
              attachedFrame: slideElement2,
            },
          },
          elementIds,
          frameElementIds: [slideElement0, slideElement2],
        },
      },
    });
  });

  it('should update document with a single slide and all elements inside of initial whiteboard size', () => {
    const doc = createWhiteboardDocument(WhiteboardDocumentVersion.Initial);

    const element0 = mockRectangleElement();
    const [changeFn] = generateAddElement(slide0, element0);
    doc.performChange(changeFn);

    const doc1 = createWhiteboardDocument(WhiteboardDocumentVersion.Frames);
    const updateChangeFn = generateFramesUpdate(doc.getData());
    doc1.performChange(updateChangeFn);

    expect(getNormalizedSlideIds(doc1.getData())).toEqual([slide0]);
    const elementIds = getNormalizedElementIds(doc1.getData(), slide0);

    expect(elementIds).toHaveLength(2);

    const [slideElement0, slideElement1] = elementIds;

    // a frame with the elements of the slide
    expect(doc1.getData().toJSON()).toEqual({
      slideIds: [slide0],
      slides: {
        [slide0]: {
          elements: {
            [slideElement0]: {
              type: 'frame',
              position: { x: 8640, y: 4860 },
              width: 1920,
              height: 1080,
              attachedElements: [slideElement1],
            },
            [slideElement1]: {
              ...mockRectangleElement({
                position: { x: 8640, y: 4861 },
              }),
              attachedFrame: slideElement0,
            },
          },
          elementIds,
          frameElementIds: [slideElement0],
        },
      },
    });
  });

  it('should update document with a single slide and any element outside of initial whiteboard size', () => {
    const doc = createWhiteboardDocument(WhiteboardDocumentVersion.Initial);

    const element0 = mockRectangleElement({
      position: {
        x: 9600,
        y: 5400,
      },
    });
    const [changeFn] = generateAddElement(slide0, element0);
    doc.performChange(changeFn);

    const doc1 = createWhiteboardDocument(WhiteboardDocumentVersion.Frames);
    const updateChangeFn = generateFramesUpdate(doc.getData());
    doc1.performChange(updateChangeFn);

    expect(getNormalizedSlideIds(doc1.getData())).toEqual([slide0]);
    const elementIds = getNormalizedElementIds(doc1.getData(), slide0);

    expect(elementIds).toHaveLength(1);

    const [slideElement0] = elementIds;

    // keep all the elements and add them, no frames created
    expect(doc1.getData().toJSON()).toEqual({
      slideIds: [slide0],
      slides: {
        [slide0]: {
          elements: {
            [slideElement0]: element0,
          },
          elementIds,
          frameElementIds: [],
        },
      },
    });
  });
});
