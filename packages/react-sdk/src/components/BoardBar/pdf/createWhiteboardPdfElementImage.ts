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

import log from 'loglevel';
import { Content } from 'pdfmake/interfaces';
import { ImageElement } from '../../../state';
import { WhiteboardFileExport } from '../../../state/export/whiteboardDocumentExport';
import { ThemeOptions } from './themeOptions';
import { base64ToBlob, canvas, conv2png, image } from './utils';

export async function createWhiteboardPdfElementImage(
  element: ImageElement,
  file: WhiteboardFileExport | undefined,
  themeOptions: ThemeOptions,
  noImageSvg: string,
): Promise<Content> {
  if (file) {
    // We dont do any assumptions on the image type here, we just convert it to a png.
    //
    // Note that past versions of this did always check the image type before converting it to a png.
    // However we cant reliably do the type check in a browser. So we just convert it to a png which always works.
    const blob = base64ToBlob(element, file.data);
    const data = await conv2png(element, blob);
    return image(element, data);
  } else {
    log.warn('No file provided, use placeholder for image element', element);

    return createNoImageContent(element, themeOptions, noImageSvg);
  }
}

async function createNoImageContent(
  element: ImageElement,
  themeOptions: ThemeOptions,
  noImageSvg: string,
): Promise<Content> {
  const position = element.position;
  const { width, height } = element;

  // select min to keep ratio
  const size = Math.min(width, height);
  const noImageSize = size / 3;

  const noImageElement = {
    position: {
      x: position.x + width / 2 - size / 6,
      y: position.y + height / 2 - size / 6,
    },
    width: noImageSize,
    height: noImageSize,
  };

  const blob = new Blob([noImageSvg], { type: 'image/svg+xml' });
  let data: string | undefined = undefined;
  try {
    data = await conv2png(noImageElement, blob);
  } catch {
    // fails if image has around zero width or height
    log.warn('Could not generate png for no image svg');
  }

  const content: Content = [];

  content.push(
    canvas({
      type: 'rect',
      x: position.x,
      y: position.y,
      w: width,
      h: height,
      color: themeOptions.paletteErrorMain,
      fillOpacity: 0.05,
      lineWidth: 2,
      lineColor: themeOptions.paletteErrorMain,
      dash: {
        length: 10,
      },
    }),
  );

  if (data) {
    content.push(image(noImageElement, data));
  }

  return content;
}
