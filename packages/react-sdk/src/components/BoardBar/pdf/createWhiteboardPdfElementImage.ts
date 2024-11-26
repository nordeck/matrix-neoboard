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

export async function createWhiteboardPdfElementImage(
  element: ImageElement,
  files: WhiteboardFileExport[],
): Promise<Content> {
  const file = files.find((f) => f.mxc === element.mxc);
  if (file) {
    // We dont do any assumptions on the image type here, we just convert it to a png.
    //
    // Note that past versions of this did always check the image type before converting it to a png.
    // However we cant reliably do the type check in a browser. So we just convert it to a png which always works.
    const data = await conv2png(element, file.data);
    return image(element, data);
  }

  console.error('Could not get image url', element);
  return [];
}
