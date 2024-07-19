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

import '@fontsource/noto-emoji/400.css';
import { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { isDefined } from '../../../lib';
import { WhiteboardInstance } from '../../../state';
import { whiteboardHeight, whiteboardWidth } from '../../Whiteboard';
import { createWhiteboardPdfContentSlide } from './createWhiteboardPdfContentSlide';
import { forceLoadFontFamily } from './forceLoadFontFamily';

export async function createWhiteboardPdfDefinition({
  whiteboardInstance,
  roomName,
  authorName,
  baseUrl,
}: {
  whiteboardInstance: WhiteboardInstance;
  roomName: string;
  authorName: string;
  baseUrl: string;
}): Promise<TDocumentDefinitions> {
  // make sure the font is loaded so the text size calculations are correct
  await forceLoadFontFamily('Noto Emoji');
  const whiteboardExport = await whiteboardInstance.export(baseUrl);

  return {
    pageMargins: 0,
    pageSize: { width: whiteboardWidth, height: whiteboardHeight },
    content: whiteboardInstance
      .getSlideIds()
      .map<Content | undefined>((slideId, idx) => {
        const slide = whiteboardInstance.getSlide(slideId);

        if (slide) {
          return {
            stack: [
              createWhiteboardPdfContentSlide(
                slide,
                whiteboardExport.whiteboard.files,
              ),
            ],
            pageBreak: idx > 0 ? 'before' : undefined,
          };
        }

        return undefined;
      })
      .filter(isDefined),
    version: '1.5',
    styles: {
      emoji: {
        font: 'Noto Emoji',
      },
    },
    info: {
      title: roomName,
      author: authorName,
    },
  };
}
