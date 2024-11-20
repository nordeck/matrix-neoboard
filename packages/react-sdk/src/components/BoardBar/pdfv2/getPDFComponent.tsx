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

import { Document, Page, Svg } from '@react-pdf/renderer';
import { WhiteboardDocumentExport } from '../../../state/export/whiteboardDocumentExport';
import { PDFElementImage } from './elements/PDFElementImage';
import { whiteboardHeight, whiteboardWidth } from '../../Whiteboard/constants';
import PDFElementShape from './elements/PDFElementShape';
import { Fragment } from 'react';


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
        const svgEleemnts = elements.filter((element) => element.type !== 'image');
        const imageElements = elements.filter((element) => element.type === 'image');

        return (
          <Page key={i} size={[whiteboardWidth, whiteboardHeight]}>
            {/* Needed for the elements to render properly */}
            <Svg viewBox={`0 0 ${whiteboardWidth} ${whiteboardHeight}`}>
              {svgEleemnts.map((element, j) => {
                const type = element.type;
                return (
                  <Fragment key={j}>
                    {type === 'shape' && (
                      <PDFElementShape element={element} />
                    )}
                  </Fragment>
                );
              })}
            </Svg>
            {imageElements.map((element, j) => (
              <PDFElementImage key={j} element={element} files={files} />
            ))}
          </Page>
        );
      })}
    </Document>
  );
};
