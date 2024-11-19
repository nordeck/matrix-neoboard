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

export function PDFElementImage({
  element,
  files,
}: {
  element: ImageElement;
  files?: WhiteboardFileExport[];
}) {
  const file = files?.find((f) => f.mxc === element.mxc);
  if (file) {
    // Convert the file.data base64 string to a URL object using a Blob
    const blob = new Blob([file.data], { type: element.mimeType });
    const url = URL.createObjectURL(blob);

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
