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

import { WhiteboardDocumentExport } from '../../../state/export/whiteboardDocumentExport';

const renderPDF = async (exportData: WhiteboardDocumentExport) => {
  const { pdf, Font } = await import('@react-pdf/renderer');
  const { PDFComponent } = await import('./getPDFComponent');
  const { createElement } = await import('react');
  const { default: interFont } = await import('./fonts/Inter-Regular.ttf');
  const { default: interBoldFont } = await import('./fonts/Inter-Bold.ttf');
  const { default: interItalicFont } = await import('./fonts/Inter-Italic.ttf');
  const { default: interBoldItalicFont } = await import(
    './fonts/Inter-BoldItalic.ttf'
  );

  Font.registerEmojiSource({
    format: 'png',
    // TODO: Replace with something we serve ourselves
    url: 'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/',
  });
  Font.register({
    family: 'Inter',
    fonts: [
      { src: interFont },
      { src: interBoldFont, fontWeight: 'bold' },
      { src: interItalicFont, fontStyle: 'italic' },
      { src: interBoldItalicFont, fontWeight: 'bold', fontStyle: 'italic' },
    ],
  });

  // @ts-expect-error -- Unclear types for now
  return pdf(createElement(PDFComponent, { exportData })).toBlob();
};

export { renderPDF };
