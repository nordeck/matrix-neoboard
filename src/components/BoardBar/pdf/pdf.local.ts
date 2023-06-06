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

// Always make sure to initialize fonts if PDFs are generated.
import './initializeFonts';

import * as pdfMake from 'pdfmake/build/pdfmake';
import { TDocumentDefinitions } from 'pdfmake/interfaces';

/**
 * Generate the PDF in a separate module that can either:
 *   1. be imported by a web worker
 *   2. be imported lazily as a separate module
 */
export function generatePdf(content: TDocumentDefinitions): Promise<Blob> {
  const pdf = pdfMake.createPdf(content);
  return new Promise<Blob>((resolve) => pdf.getBlob(resolve));
}
