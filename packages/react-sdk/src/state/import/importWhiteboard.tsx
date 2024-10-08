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

import log from 'loglevel';
import { ImageUploadState } from '../../components/ImageUpload/ImageUploadProvider';
import { ImageElement } from '../crdt';
import { WhiteboardDocumentExport } from '../export';
import { WhiteboardInstance } from '../types';

/**
 * Import a whiteboard including images.
 *
 * Images will be uploaded to the Matrix content repo.
 * If there is an error or image data is not found,
 * then image elements with an empty MXC URI are added to the board.
 */
export async function importWhiteboard(
  whiteboard: WhiteboardInstance,
  data: WhiteboardDocumentExport,
  handleDrop: ImageUploadState['handleDrop'],
  atSlideIndex?: number,
) {
  const mxcMap = await uploadImages(data, handleDrop);
  const importData = updateMxcs(data, mxcMap);
  whiteboard.import(importData, atSlideIndex);
}

async function uploadImages(
  data: WhiteboardDocumentExport,
  handleDrop: ImageUploadState['handleDrop'],
): Promise<Map<string, string>> {
  const imageElements = extractImageElements(data);
  const files = mapToFiles(imageElements, data.whiteboard.files);
  const results = await handleDrop(
    files.map((f) => f.file),
    [],
  );

  const mxcMap = new Map<string, string>();

  results.forEach((result, index) => {
    const file = files[index];

    if (file === undefined) {
      // should not happen
      throw new Error('Matching file not found');
    }

    if (result.status === 'fulfilled') {
      mxcMap.set(file.mxc, result.value.mxc);
    } else {
      // In case of an error, set to an empty string, that is an invalid MXC URI
      mxcMap.set(file.mxc, '');
    }
  });

  return mxcMap;
}

/**
 * Get a flat list of all image elements on the whiteboard.
 */
function extractImageElements(data: WhiteboardDocumentExport): ImageElement[] {
  return data.whiteboard.slides.reduce<ImageElement[]>(
    (imageElements, slide) => {
      return [
        ...imageElements,
        ...(slide.elements.filter((e) => e.type === 'image') as ImageElement[]),
      ];
    },
    [],
  );
}

type MapToFilesResult = {
  // original MXC URI
  mxc: string;
  // File object for image data
  file: File;
}[];

function mapToFiles(
  imageElements: ImageElement[],
  exportedFiles: WhiteboardDocumentExport['whiteboard']['files'],
): MapToFilesResult {
  const files: MapToFilesResult = [];

  for (const imageElement of imageElements) {
    const exportedFile = exportedFiles?.find((f) => f.mxc === imageElement.mxc);

    if (exportedFile === undefined) {
      log.warn('Unable to find exported file', imageElement);
      continue;
    }

    const file = new File(
      [Uint8Array.from(atob(exportedFile.data), (m) => m.codePointAt(0) ?? 0)],
      imageElement.fileName,
      { type: imageElement.mimeType },
    );
    files.push({
      mxc: imageElement.mxc,
      file,
    });
  }

  return files;
}

function updateMxcs(
  data: WhiteboardDocumentExport,
  mxcMap: Map<string, string>,
): WhiteboardDocumentExport {
  const dataWithReplacedMxcs = JSON.parse(JSON.stringify(data));
  const imageElements = extractImageElements(dataWithReplacedMxcs);

  for (const imageElement of imageElements) {
    // Replace the MXC URI. Set to empty if missing.
    // That will result in an invalid MXC and show a placeholder.
    imageElement.mxc = mxcMap.get(imageElement.mxc) || '';
  }

  return dataWithReplacedMxcs;
}
