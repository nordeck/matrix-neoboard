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
import { WhiteboardSlideInstance } from '../../../state';
import { WhiteboardFileExport } from '../../../state/export/whiteboardDocumentExport';
import { createWhiteboardPdfElementImage } from './createWhiteboardPdfElementImage';
import { createWhiteboardPdfElementPath } from './createWhiteboardPdfElementPath';
import { createWhiteboardPdfElementShape } from './createWhiteboardPdfElementShape';

export async function createWhiteboardPdfContentSlide(
  slideInstance: WhiteboardSlideInstance,
  files?: Array<WhiteboardFileExport>,
): Promise<Content> {
  return await Promise.all(
    slideInstance.getElementIds().map(async (elementId) => {
      const element = slideInstance.getElement(elementId);

      switch (element?.type) {
        case 'shape':
          return createWhiteboardPdfElementShape(element);

        case 'path':
          return createWhiteboardPdfElementPath(element);

        case 'image':
          if (!files) {
            console.error('No files provided for image element', element);
            return [];
          }
          return await createWhiteboardPdfElementImage(element, files!);

        default:
          console.error('Unknown element type', element);
          return [];
      }
    }),
  );
}
