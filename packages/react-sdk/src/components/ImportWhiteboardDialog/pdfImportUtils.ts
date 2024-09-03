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
import { RenderParameters } from 'pdfjs-dist/types/src/display/api';

// This is a weird oddity of pdfjs. It requires the worker to be loaded from a URL.
export async function initPDFJs() {
  if (!Object.prototype.hasOwnProperty.call(process.env, 'SSR')) {
    console.log('Loading pdf.worker.mjs in webpack');
    // @ts-expect-error -- There are no types for this file
    await import('pdfjs-dist/webpack');
  } else {
    console.log('Loading pdf.worker.mjs in vitejs');
    // @ts-expect-error -- There are no types for this file
    const pdfJSWorker = await import('pdfjs-dist/build/pdf.worker.mjs?url');
    GlobalWorkerOptions.workerSrc = pdfJSWorker.default;
  }
}

export interface PDFImportResult {
  data: ArrayBuffer;
  mimeType: string;
  size: number;
  width: number;
  height: number;
}

export async function loadPDF(file: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfLoadingTask = await getDocument(file);
  const pdf = await pdfLoadingTask.promise;
  return pdf;
}

export async function renderPDFToImages(
  pdf: PDFDocumentProxy,
  desiredWidth: number = 1920,
  desiredHeight: number = 1080,
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

async function renderPDFPageToImage(
  page: PDFPageProxy,
  desiredWidth: number = 1920,
  desiredHeight: number = 1080,
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

  // Support HiDPI-screens.
  const outputScale = window.devicePixelRatio || 1;

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

async function convertCanvasToImage(canvas: OffscreenCanvas): Promise<Blob> {
  return await canvas.convertToBlob();
}