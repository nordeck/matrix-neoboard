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

import loglevel from 'loglevel';
import { convertMxcToHttpUrl, isDefined } from '../../lib';
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

export async function convertWhiteboardToExportFormat(
  doc: SharedMap<WhiteboardDocument>,
  baseUrl: string,
): Promise<WhiteboardDocumentExport> {
  const fileExportPromises = exportFiles(doc, baseUrl);
  const fileExportPromiseResults = await Promise.allSettled(fileExportPromises);
  const files: WhiteboardFileExport[] = [];

  for (const fileExportPromiseResult of fileExportPromiseResults) {
    if (fileExportPromiseResult.status === 'fulfilled') {
      files.push(fileExportPromiseResult.value);
    }
  }

  return {
    version: 'net.nordeck.whiteboard@v1',
    whiteboard: {
      slides: getNormalizedSlideIds(doc).map((slideId) => ({
        elements: getNormalizedElementIds(doc, slideId)
          .map((elementId) => getElement(doc, slideId, elementId)?.toJSON())
          .filter(isDefined),
        lock: getSlideLock(doc, slideId) ? {} : undefined,
      })),
      files,
    },
  };
}

function exportFiles(
  doc: SharedMap<WhiteboardDocument>,
  baseUrl: string,
): Promise<WhiteboardFileExport>[] {
  const promises: Promise<WhiteboardFileExport>[] = [];

  for (const slideId of getNormalizedSlideIds(doc)) {
    for (const elementId of getNormalizedElementIds(doc, slideId)) {
      const element = getElement(doc, slideId, elementId);

      if (!isImageElement(element)) {
        continue;
      }

      promises.push(exportFile(element, baseUrl));
    }
  }

  return promises;
}

async function exportFile(
  element: SharedMap<ImageElement>,
  baseUrl: string,
): Promise<WhiteboardFileExport> {
  const mxc = element.get('mxc');
  const url = convertMxcToHttpUrl(mxc, baseUrl);

  if (url === null) {
    loglevel.error('Failed to get URL for MXC URI', {
      mxc,
      baseUrl,
    });
    throw new Error();
  }

  const response = await fetch(url);

  if (!response.ok) {
    loglevel.error('Error fetching image data', {
      status: response.status,
    });
    throw new Error();
  }

  const base64Data = await responseToBase64(response);
  return {
    mxc,
    data: base64Data,
  };
}

function isImageElement(
  element?: SharedMap<Element>,
): element is SharedMap<ImageElement> {
  return element?.get('type') === 'image';
}

async function responseToBase64(response: Response): Promise<string> {
  const blob = await response.blob();

  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    const handleLoaded = () => {
      reader.removeEventListener('error', handleError);

      if (typeof reader.result !== 'string') {
        loglevel.error('Got non string data URL');
        return reject();
      }

      const posOfPrefix = reader.result.indexOf('base64,');

      if (posOfPrefix === -1) {
        loglevel.error('Unable to find data: prefix');
        return reject();
      }

      resolve(
        // strip off data: prefix
        reader.result.substring(posOfPrefix + 8),
      );
    };

    const handleError = () => {
      reader.removeEventListener('loadend', handleLoaded);
      reject();
    };

    reader.addEventListener('loadend', handleLoaded, { once: true });
    reader.addEventListener('error', handleError, { once: true });
    reader.readAsDataURL(blob);
  });
}
