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

import log from 'loglevel';
import { convertBlobToBase64, convertMxcToHttpUrl, isDefined } from '../../lib';
import {
  Element,
  ImageElement,
  WhiteboardDocument,
  getElement,
  getNormalizedElementIds,
  getNormalizedSlideIds,
  getSlideLock,
} from '../crdt';
import { SharedMap } from '../crdt/y';
import {
  WhiteboardDocumentExport,
  WhiteboardFileExport,
} from './whiteboardDocumentExport';

/**
 * Export a whiteboard including files.
 * If a file download raises an error the data won't be included into the export.
 * However the information about the image element itself will still be part of the whiteboard data.
 *
 * @param doc - Document of the whiteboard to export
 * @param baseUrl - Homeserver base URL to download the files
 *
 * @returns A Promise that resolves to a whiteboard export
 */
export async function exportWhiteboard(
  doc: SharedMap<WhiteboardDocument>,
  baseUrl: string,
): Promise<WhiteboardDocumentExport> {
  const files = await exportFiles(doc, baseUrl);

  return {
    version: 'net.nordeck.whiteboard@v1',
    whiteboard: {
      slides: getNormalizedSlideIds(doc).map((slideId) => ({
        elements: getNormalizedElementIds(doc, slideId)
          .map((elementId) => getElement(doc, slideId, elementId)?.toJSON())
          .filter(isDefined),
        lock: getSlideLock(doc, slideId) ? {} : undefined,
      })),
      // Only add files if there is at least one
      ...(files.length > 0 ? { files } : {}),
    },
  };
}

async function exportFiles(
  doc: SharedMap<WhiteboardDocument>,
  baseUrl: string,
): Promise<WhiteboardFileExport[]> {
  const fileExportPromises = downloadFiles(doc, baseUrl);
  // wait for all downloads to finish, independently of their result
  const fileExportPromiseResults = await Promise.allSettled(fileExportPromises);
  const files: WhiteboardFileExport[] = [];

  for (const fileExportPromiseResult of fileExportPromiseResults) {
    if (fileExportPromiseResult.status === 'fulfilled') {
      // Do only return fulfilled results here.
      // Ignore the rest. Logging is done in other places.
      files.push(fileExportPromiseResult.value);
      continue;
    }

    log.error(
      'Error downloading image on export',
      fileExportPromiseResult.reason,
    );
  }

  return files;
}

function downloadFiles(
  doc: SharedMap<WhiteboardDocument>,
  baseUrl: string,
): Promise<WhiteboardFileExport>[] {
  const promises: Promise<WhiteboardFileExport>[] = [];
  const handledMxcs: string[] = [];

  for (const slideId of getNormalizedSlideIds(doc)) {
    for (const elementId of getNormalizedElementIds(doc, slideId)) {
      const element = getElement(doc, slideId, elementId);

      if (!isImageElementSharedMap(element)) {
        continue;
      }

      if (handledMxcs.includes(element.get('mxc'))) {
        continue;
      }

      handledMxcs.push(element.get('mxc'));
      promises.push(downloadFile(element, baseUrl));
    }
  }

  return promises;
}

function isImageElementSharedMap(
  element?: SharedMap<Element>,
): element is SharedMap<ImageElement> {
  return element?.get('type') === 'image';
}

async function downloadFile(
  element: SharedMap<ImageElement>,
  baseUrl: string,
): Promise<WhiteboardFileExport> {
  const mxc = element.get('mxc');
  const url = convertMxcToHttpUrl(mxc, baseUrl);

  if (url === null) {
    throw new Error(`Failed to get URL for MXC URI, ${baseUrl}, ${mxc}`);
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Error fetching image data, ${response.status}, ${response.body}`,
    );
  }

  const blob = await response.blob();
  const data = await convertBlobToBase64(blob);
  return {
    mxc,
    data,
  };
}
