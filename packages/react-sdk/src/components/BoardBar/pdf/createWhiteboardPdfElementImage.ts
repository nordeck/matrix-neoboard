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

import { Content } from 'pdfmake/interfaces';
import { ImageElement } from '../../../state';
import { WhiteboardFileExport } from '../../../state/export/whiteboardDocumentExport';
import { conv2png, image } from './utils';

export function createWhiteboardPdfElementImage(
  element: ImageElement,
  files: WhiteboardFileExport[],
): Content {
  const file = files.find((f) => f.mxc === element.mxc);
  if (file) {
    // pdfmake only supports png and jpeg images,
    // so we use a canvas to convert other image types to png
    // ref: https://pdfmake.github.io/docs/0.1/document-definition-object/images/
    if (element.mimeType === 'image/png' || element.mimeType === 'image/jpeg') {
      return image(element, file.data);
    } else {
      const data = conv2png(element, file.data);
      return image(element, data);
    }
  }

  console.error('Could not get image url', element);
  return [];
}
