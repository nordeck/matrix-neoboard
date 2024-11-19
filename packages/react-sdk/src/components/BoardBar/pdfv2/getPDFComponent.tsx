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

import { Document, Page } from '@react-pdf/renderer';
import { WhiteboardDocumentExport } from '../../../state/export/whiteboardDocumentExport';
import { PDFElementImage } from './elements/PDFElementImage';

export type PDFProps = {
  exportData: WhiteboardDocumentExport;
};

export const PDFComponent = ({ exportData }: PDFProps) => {
  const slides = exportData.whiteboard.slides;
  const files = exportData.whiteboard.files;

  return (
    <Document>
      {slides.map((slide, i) => {
        const elements = slide.elements;

        return (
          <Page key={i}>
            {elements.map((element, j) => {
              const type = element.type;
              return (
                <div key={j}>
                  {type === 'image' && (
                    <PDFElementImage element={element} files={files} />
                  )}
                  {/*{type === 'shape' && (
                    <ShapeElement element={element} />
                  )}
                  {type === 'path' && (
                    <PathElement element={element} />
                  )}*/}
                </div>
              );
            })}
          </Page>
        );
      })}
    </Document>
  );
};
