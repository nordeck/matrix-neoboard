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

import { Content } from 'pdfmake/interfaces';
import { Element, Point, WhiteboardSlideInstance } from '../../../state';
import { WhiteboardFileExport } from '../../../state/export/whiteboardDocumentExport';
import { createWhiteboardPdfElementImage } from './createWhiteboardPdfElementImage';
import { createWhiteboardPdfElementPath } from './createWhiteboardPdfElementPath';
import { createWhiteboardPdfElementShape } from './createWhiteboardPdfElementShape';
import { ThemeOptions } from './themeOptions';

export async function createWhiteboardPdfContentSlide(
  slideInstance: WhiteboardSlideInstance,
  elementIds: string[],
  files: Array<WhiteboardFileExport>,
  themeOptions: ThemeOptions,
  noImageSvg: string,
  offset: Point = { x: 0, y: 0 },
): Promise<Content> {
  return await Promise.all(
    elementIds.map(async (elementId) => {
      const element = slideInstance.getElement(elementId);

      if (element === undefined) {
        return [];
      }

      const newElement = transformElement(element, offset);

      switch (newElement.type) {
        case 'shape':
          return createWhiteboardPdfElementShape(newElement);

        case 'path':
          return createWhiteboardPdfElementPath(newElement);

        case 'image': {
          const file = files.find((f) => f.mxc === newElement.mxc);
          return await createWhiteboardPdfElementImage(
            newElement,
            file,
            themeOptions,
            noImageSvg,
          );
        }

        default:
          console.error('Unknown element type', newElement);
          return [];
      }
    }),
  );
}

function transformElement(element: Element, offset: Point): Element {
  const {
    position: { x, y },
    ...otherProperties
  } = element;
  return {
    ...otherProperties,
    position: {
      x: x + offset.x,
      y: y + offset.y,
    },
  };
}
