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

import { getLogger } from 'loglevel';
import {
  ImageElement,
  isValidWhiteboardExportDocument,
  WhiteboardDocumentExport,
} from '../../state';
import { whiteboardHeight, whiteboardWidth } from '../Whiteboard/constants';
import { initPDFJs, loadPDF, renderPDFToImages } from './pdfImportUtils';

/**
 * Reads a PDF file and converts it into a whiteboard document export format.
 *
 * @param file - The PDF file to be read.
 * @returns A promise that resolves to a `WhiteboardDocumentExport` object containing the whiteboard data.
 *
 * The function performs the following steps:
 * 1. Initializes the PDF.js library.
 * 3. Loads the PDF from the provided file.
 * 5. Renders the PDF pages to images.
 * 7. Converts each rendered image to a base64-encoded string.
 * 8. Constructs the whiteboard data with slides and files based on the rendered images.
 */
export async function readPDF(file: File): Promise<WhiteboardDocumentExport> {
  await initPDFJs();

  const logger = getLogger('readPDF');
  logger.debug('Reading PDF file', file.name);

  const pdf = await loadPDF(await file.arrayBuffer());
  logger.debug('PDF loaded', pdf.numPages);

  logger.debug('Rendering PDF to images');
  const images = await renderPDFToImages(pdf);

  logger.debug('PDF rendered to images', images.length);

  const imageData = [];
  for (const image of images) {
    const base64 = btoa(
      new Uint8Array(image.data).reduce(
        (data, byte) => data + String.fromCharCode(byte),
        '',
      ),
    );

    imageData.push({
      width: image.width,
      height: image.height,
      size: image.size,
      mimeType: image.mimeType,
      base64: base64,
    });
  }

  const whiteboardData: WhiteboardDocumentExport = {
    version: 'net.nordeck.whiteboard@v1',
    whiteboard: {
      // Each image is a slide
      slides: imageData.map((data, i) => ({
        elements: [
          {
            type: 'image',
            mxc: 'placeholder' + i,
            width: data.width,
            height: data.height,
            fileName: `${file.name}_${i}`,
            mimeType: data.mimeType,
            position: {
              x: (whiteboardWidth - data.width) / 2,
              y: (whiteboardHeight - data.height) / 2,
            },
          } as ImageElement,
        ],
      })),
      files: imageData.map((data, i) => ({
        mxc: 'placeholder' + i,
        data: data.base64,
      })),
    },
  };
  return whiteboardData;
}

/**
 * Reads a whiteboard document from a given file and returns a promise that resolves with the document's data.
 *
 * @param {File} file - The file to be read.
 * @returns {Promise<{ name: string; isError: boolean; data?: WhiteboardDocumentExport }>}
 * A promise that resolves with an object containing the file name, an error flag, and optionally the whiteboard document data.
 *
 * The promise resolves with:
 * - `name`: The name of the file.
 * - `isError`: A boolean indicating if there was an error reading or parsing the file.
 * - `data`: The parsed whiteboard document data if no error occurred.
 */
export function readNWB(file: File): Promise<{
  name: string;
  isError: boolean;
  data?: WhiteboardDocumentExport;
}> {
  const reader = new FileReader();

  const logger = getLogger('readNWB');

  return new Promise((resolve) => {
    reader.onabort = () => logger.warn('file reading was aborted');
    reader.onerror = () => logger.warn('file reading has failed');
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        return;
      }

      try {
        const jsonData = JSON.parse(reader.result);

        if (isValidWhiteboardExportDocument(jsonData)) {
          resolve({
            name: file.name,
            isError: false,
            data: jsonData,
          });
        } else {
          resolve({
            name: file.name,
            isError: true,
          });
        }
      } catch (ex) {
        const logger = getLogger('SettingsMenu');
        logger.error('Error while parsing the selected import file', ex);

        resolve({
          name: file.name,
          isError: true,
        });
      }
    };

    reader.readAsText(file);
  });
}
