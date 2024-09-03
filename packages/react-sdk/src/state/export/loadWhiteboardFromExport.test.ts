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

import {
  mockCircleElement,
  mockEllipseElement,
  mockTriangleElement,
} from '../../lib/testUtils/documentTestUtils';
import {
  createWhiteboardDocument,
  getNormalizedElementIds,
  getNormalizedSlideIds,
} from '../crdt';
import { generateLoadWhiteboardFromExport } from './loadWhiteboardFromExport';
import { WhiteboardDocumentExport } from './whiteboardDocumentExport';

describe('generateLoadWhiteboardFromExport', () => {
  it('should load the slides in the correct order', () => {
    const exportDocument: WhiteboardDocumentExport = {
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [
          { elements: [mockEllipseElement({ kind: 'ellipse' })] },
          { elements: [mockCircleElement({ kind: 'circle' })] },
          { elements: [mockTriangleElement({ kind: 'triangle' })] },
        ],
      },
    };

    const document = createWhiteboardDocument();

    const importWhiteboard = generateLoadWhiteboardFromExport(
      exportDocument,
      '@user-id',
    );
    document.performChange(importWhiteboard);

    const doc = document.getData();

    const [slide0, slide1, slide2] = getNormalizedSlideIds(doc);

    const [slide0Element0] = getNormalizedElementIds(doc, slide0);
    const [slide1Element0] = getNormalizedElementIds(doc, slide1);
    const [slide2Element0] = getNormalizedElementIds(doc, slide2);

    expect(doc.toJSON()).toEqual({
      slides: {
        [slide0]: {
          elements: {
            [slide0Element0]: mockEllipseElement({ kind: 'ellipse' }),
          },
          elementIds: [slide0Element0],
        },
        [slide1]: {
          elements: {
            [slide1Element0]: mockCircleElement({ kind: 'circle' }),
          },
          elementIds: [slide1Element0],
        },
        [slide2]: {
          elements: {
            [slide2Element0]: mockTriangleElement({ kind: 'triangle' }),
          },
          elementIds: [slide2Element0],
        },
      },
      slideIds: [slide0, slide1, slide2],
    });
  });

  it('should load the elements in the correct order', () => {
    const exportDocument: WhiteboardDocumentExport = {
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [
          {
            elements: [
              mockCircleElement({ kind: 'circle' }),
              mockTriangleElement({ kind: 'triangle' }),
              mockEllipseElement({ kind: 'ellipse' }),
            ],
          },
        ],
      },
    };

    const document = createWhiteboardDocument();

    const importWhiteboard = generateLoadWhiteboardFromExport(
      exportDocument,
      '@user-id',
    );
    document.performChange(importWhiteboard);

    const doc = document.getData();

    const [slide0] = getNormalizedSlideIds(doc);

    const [slide0Element0, slide0Element1, slide0Element2] =
      getNormalizedElementIds(doc, slide0);

    expect(doc.toJSON()).toEqual({
      slides: {
        [slide0]: {
          elements: {
            [slide0Element0]: mockCircleElement({ kind: 'circle' }),
            [slide0Element1]: mockTriangleElement({ kind: 'triangle' }),
            [slide0Element2]: mockEllipseElement({ kind: 'ellipse' }),
          },
          elementIds: [slide0Element0, slide0Element1, slide0Element2],
        },
      },
      slideIds: [slide0],
    });
  });

  it('should load the lock status of a slide', () => {
    const exportDocument: WhiteboardDocumentExport = {
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [
          { elements: [] },
          { elements: [], lock: { userId: '@another-user-id' } },
        ],
      },
    };

    const document = createWhiteboardDocument();

    const importWhiteboard = generateLoadWhiteboardFromExport(
      exportDocument,
      '@user-id',
    );
    document.performChange(importWhiteboard);

    const doc = document.getData();

    const [slide0, slide1] = getNormalizedSlideIds(doc);

    expect(doc.toJSON()).toEqual({
      slides: {
        [slide0]: { elements: {}, elementIds: [] },
        [slide1]: {
          elements: {},
          elementIds: [],
          lock: { userId: '@user-id' },
        },
      },
      slideIds: [slide0, slide1],
    });
  });

  it('should insert the slides at the desired slide index', () => {
    const exportDocument: WhiteboardDocumentExport = {
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [
          { elements: [mockEllipseElement({ kind: 'ellipse' })] },
          { elements: [mockCircleElement({ kind: 'circle' })] },
        ],
      },
    };

    const document = createWhiteboardDocument();

    // Replace the whiteboard to make the output predictable.
    const importWhiteboard1 = generateLoadWhiteboardFromExport(
      exportDocument,
      '@user-id',
    );
    document.performChange(importWhiteboard1);

    // Import it a second time, but this time insert it into the existing whiteboard.
    const importWhiteboard2 = generateLoadWhiteboardFromExport(
      exportDocument,
      '@user-id',
      1,
    );
    document.performChange(importWhiteboard2);

    const doc = document.getData();

    const [slide0, slide1, slide2, slide3] = getNormalizedSlideIds(doc);

    const [slide0Element0] = getNormalizedElementIds(doc, slide0);
    const [slide1Element0] = getNormalizedElementIds(doc, slide1);
    const [slide2Element0] = getNormalizedElementIds(doc, slide2);
    const [slide3Element0] = getNormalizedElementIds(doc, slide3);

    expect(doc.toJSON()).toEqual({
      slides: {
        [slide0]: {
          elements: {
            [slide0Element0]: mockEllipseElement({ kind: 'ellipse' }),
          },
          elementIds: [slide0Element0],
        },
        [slide1]: {
          elements: {
            [slide1Element0]: mockEllipseElement({ kind: 'ellipse' }),
          },
          elementIds: [slide1Element0],
        },
        [slide2]: {
          elements: {
            [slide2Element0]: mockEllipseElement({ kind: 'circle' }),
          },
          elementIds: [slide2Element0],
        },
        [slide3]: {
          elements: {
            [slide3Element0]: mockEllipseElement({ kind: 'circle' }),
          },
          elementIds: [slide3Element0],
        },
      },
      slideIds: [slide0, slide1, slide2, slide3],
    });
  });
});
