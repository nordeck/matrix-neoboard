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

import { Image } from '@react-pdf/renderer';
import { ImageElement } from '../../../../state';
import { WhiteboardFileExport } from '../../../../state/export/whiteboardDocumentExport';

const signatures = {
  JVBERi0: 'application/pdf',
  R0lGODdh: 'image/gif',
  R0lGODlh: 'image/gif',
  iVBORw0KGgo: 'image/png',
  '/9j/': 'image/jpg',
} as const;

function detectMimeType(b64: string): string | undefined {
  for (const s in signatures) {
    if (b64.indexOf(s) === 0) {
      const mimeKey = Object.keys(signatures).find((v) => v === s);
      if (!mimeKey) {
        return undefined;
      }
      return signatures[mimeKey as keyof typeof signatures];
    }
  }
}

export function PDFElementImage({
  element,
  files,
}: {
  element: ImageElement;
  files?: WhiteboardFileExport[];
}) {
  const file = files?.find((f) => f.mxc === element.mxc);
  if (file) {
    // Tripple check mimetype
    const mimeType = detectMimeType(file.data);
    // Convert the file.data base64 string
    const url = `data:${mimeType};base64,${file.data}`;

    return (
      <Image
        src={url}
        style={{
          position: 'absolute',
          left: element.position.x,
          top: element.position.y,
          width: element.width,
          height: element.height,
        }}
      />
    );
  } else {
    return <></>;
  }
}
