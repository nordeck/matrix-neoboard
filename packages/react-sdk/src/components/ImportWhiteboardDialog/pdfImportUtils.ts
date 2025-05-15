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

import {
  getDocument,
  GlobalWorkerOptions,
  PDFDocumentProxy,
  PDFPageProxy,
} from 'pdfjs-dist';
import * as pdfJSWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import { RenderParameters } from 'pdfjs-dist/types/src/display/api';
import {
  frameHeight,
  frameWidth,
  infiniteCanvasMode,
  whiteboardHeight,
  whiteboardWidth,
} from '../Whiteboard';

/**
 * Initializes the PDF.js library by dynamically importing the PDF.js worker script.
 *
 * This function imports the worker script from 'pdfjs-dist/build/pdf.worker.mjs' and sets it as the worker source
 * for PDF.js using the `GlobalWorkerOptions.workerSrc` property.
 *
 * This is a weird oddity of pdfjs. It requires the worker to be loaded from a URL.
 *
 * @async
 * @function
 * @returns {Promise<void>} A promise that resolves when the worker script has been successfully imported and set.
 */
export async function initPDFJs() {
  GlobalWorkerOptions.workerSrc = pdfJSWorker.default;
}

/**
 * Represents the result of importing a PDF.
 *
 * @interface PDFImportResult
 *
 * @property {ArrayBuffer} data - The binary data of the imported PDF.
 * @property {string} mimeType - The MIME type of the imported PDF.
 * @property {number} size - The size of the imported PDF in bytes.
 * @property {number} width - The width of the imported PDF in pixels.
 * @property {number} height - The height of the imported PDF in pixels.
 */
export interface PDFImportResult {
  data: ArrayBuffer;
  mimeType: string;
  size: number;
  width: number;
  height: number;
}

/**
 * Loads a PDF document from an ArrayBuffer.
 *
 * @param file - The ArrayBuffer containing the PDF file data.
 * @returns A promise that resolves to a PDFDocumentProxy object representing the loaded PDF document.
 */
export async function loadPDF(file: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfLoadingTask = await getDocument(file);
  const pdf = await pdfLoadingTask.promise;
  return pdf;
}

/**
 * Renders each page of a PDF document to an image.
 *
 * @param pdf - The PDF document to render.
 * @param desiredWidth - The desired width of the output images. Defaults to `whiteboardWidth`.
 * @param desiredHeight - The desired height of the output images. Defaults to `whiteboardHeight`.
 * @returns A promise that resolves to an array of `PDFImportResult` objects, each representing an image of a PDF page.
 */
export async function renderPDFToImages(
  pdf: PDFDocumentProxy,
  desiredWidth: number = infiniteCanvasMode ? frameWidth : whiteboardWidth,
  desiredHeight: number = infiniteCanvasMode ? frameHeight : whiteboardHeight,
): Promise<PDFImportResult[]> {
  const images = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const imageData = await renderPDFPageToImage(
      page,
      desiredWidth,
      desiredHeight,
    );
    images.push(imageData);
  }
  return images;
}

/**
 * Renders a PDF page to an image.
 *
 * @param {PDFPageProxy} page - The PDF page to render.
 * @param {number} [desiredWidth=whiteboardWidth] - The desired width of the output image.
 * @param {number} [desiredHeight=whiteboardHeight] - The desired height of the output image.
 * @returns {Promise<PDFImportResult>} A promise that resolves to a PDFImportResult containing the image data and metadata.
 */
async function renderPDFPageToImage(
  page: PDFPageProxy,
  desiredWidth: number = whiteboardWidth,
  desiredHeight: number = whiteboardHeight,
): Promise<PDFImportResult> {
  const viewport = page.getViewport({ scale: 1 });
  let scale = desiredWidth / viewport.width;

  // Cap the scaledViewport to be a maximum of desiredWidth*desiredHeight
  let scaledViewport = page.getViewport({ scale: scale });
  if (scaledViewport.height > desiredHeight) {
    scale = desiredHeight / viewport.height;
    scaledViewport = page.getViewport({ scale: scale });
  } else if (scaledViewport.width > desiredWidth) {
    scale = desiredWidth / viewport.width;
    scaledViewport = page.getViewport({ scale: scale });
  }

  // Ensure consistent scaling
  const outputScale: number = infiniteCanvasMode ? 4 : 2;

  const canvas = new OffscreenCanvas(
    Math.floor(scaledViewport.width * outputScale),
    Math.floor(scaledViewport.height * outputScale),
  );
  const context = canvas.getContext('2d');

  const transform =
    outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

  const renderContext = {
    canvasContext: context,
    transform: transform,
    viewport: scaledViewport,
  };

  // We cast since the types are wonky with OffscreenCanvas
  const rendering = page.render(renderContext as unknown as RenderParameters);
  await rendering.promise;

  const blob = await convertCanvasToImage(canvas);
  return {
    data: await blob.arrayBuffer(),
    mimeType: blob.type,
    size: blob.size,
    width: scaledViewport.width,
    height: scaledViewport.height,
  };
}

/**
 * Converts an OffscreenCanvas to a Blob.
 *
 * @param canvas - The OffscreenCanvas to be converted.
 * @returns A promise that resolves to a Blob representing the image data of the canvas.
 */
async function convertCanvasToImage(canvas: OffscreenCanvas): Promise<Blob> {
  return await canvas.convertToBlob();
}
