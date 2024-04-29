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

import { mockEllipseElement } from '../../lib/testUtils/documentTestUtils';
import {
  createWhiteboardDocument,
  generateAddElement,
  generateAddSlide,
  generateLockSlide,
  generateMoveElement,
  generateMoveSlide,
} from '../crdt';
import { convertWhiteboardToExportFormat } from './convertWhiteboardToExportFormat';

const slide0 = 'IN4h74suMiIAK4AVMAdl_';

describe('convertWhiteboardToExportFormat', () => {
  it('should return slides in the correct order', () => {
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

    expect(convertWhiteboardToExportFormat(document.getData())).toEqual({
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

  it('should return elements in the correct order', () => {
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

    expect(convertWhiteboardToExportFormat(document.getData())).toEqual({
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

  it('should include the lock status of a slide', () => {
    const document = createWhiteboardDocument();

    document.performChange((doc) => {
      const [addSlide1, slide1] = generateAddSlide();
      addSlide1(doc);

      const lockSlide1 = generateLockSlide(slide1, '@user-id');
      lockSlide1(doc);
    });

    expect(convertWhiteboardToExportFormat(document.getData())).toEqual({
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [{ elements: [] }, { elements: [], lock: {} }],
      },
    });
  });
});
