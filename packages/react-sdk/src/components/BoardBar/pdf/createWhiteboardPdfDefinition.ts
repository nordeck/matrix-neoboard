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
import { WidgetApi } from '@matrix-widget-toolkit/api';
import { Content, TDocumentDefinitions } from 'pdfmake/interfaces';
import { isDefined } from '../../../lib';
import { WhiteboardInstance } from '../../../state';
import { whiteboardHeight, whiteboardWidth } from '../../Whiteboard';
import { createWhiteboardPdfContentSlide } from './createWhiteboardPdfContentSlide';
import { forceLoadFontFamily } from './forceLoadFontFamily';
import { ThemeOptions } from './themeOptions';

export async function createWhiteboardPdfDefinition({
  whiteboardInstance,
  roomName,
  authorName,
  widgetApi,
  themePaletteErrorMain,
}: {
  whiteboardInstance: WhiteboardInstance;
  roomName: string;
  authorName: string;
  widgetApi: WidgetApi;
  themePaletteErrorMain: string;
}): Promise<TDocumentDefinitions> {
  // make sure the font is loaded so the text size calculations are correct
  await forceLoadFontFamily('Noto Emoji');
  const whiteboardExport = await whiteboardInstance.export(widgetApi);
  const themeOptions: ThemeOptions = {
    paletteErrorMain: themePaletteErrorMain,
  };
  const noImageSvg = generateHideImageOutlinedSvg(themePaletteErrorMain);

  return {
    pageMargins: 0,
    pageSize: { width: whiteboardWidth, height: whiteboardHeight },
    content: (
      await Promise.all(
        whiteboardInstance.getSlideIds().map(async (slideId, idx) => {
          const slide = whiteboardInstance.getSlide(slideId);

          if (slide) {
            return {
              stack: [
                await createWhiteboardPdfContentSlide(
                  slide,
                  whiteboardExport.whiteboard.files ?? [],
                  themeOptions,
                  noImageSvg,
                ),
              ],
              pageBreak: idx > 0 ? 'before' : undefined,
            } as Content;
          }

          return undefined;
        }),
      )
    ).filter(isDefined),
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

function generateHideImageOutlinedSvg(errorMainColor: string): string {
  /**
   * Same as MUI hide_image_outlined_24px.svg: https://github.com/mui/material-ui/blob/master/packages/mui-icons-material/material-icons/hide_image_outlined_24px.svg
   * But with fill and fill-opacity added.
   */
  return `<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24" fill="${errorMainColor}" fill-opacity="0.3"><g><rect fill="none" height="24" width="24"/></g><g><g><path d="M19,5v11.17l2,2V5c0-1.1-0.9-2-2-2H5.83l2,2H19z"/><path d="M2.81,2.81L1.39,4.22L3,5.83V19c0,1.1,0.9,2,2,2h13.17l1.61,1.61l1.41-1.41L2.81,2.81z M5,19V7.83l7.07,7.07L11.25,16 L9,13l-3,4h8.17l2,2H5z"/></g></g></svg>`;
}
