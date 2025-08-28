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

import { WidgetApi } from '@matrix-widget-toolkit/api';
import log from 'loglevel';
import { IDownloadFileActionFromWidgetResponseData } from 'matrix-widget-api';
import {
  WidgetApiActionError,
  convertBlobToBase64,
  convertMxcToHttpUrl,
} from '../../lib';
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
  ElementExport,
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
  widgetApi: WidgetApi,
): Promise<WhiteboardDocumentExport> {
  const files = await exportFiles(doc, widgetApi);

  return {
    version: 'net.nordeck.whiteboard@v1',
    whiteboard: {
      slides: getNormalizedSlideIds(doc).map((slideId) => {
        const elements: [string, Element][] = [];
        for (const elementId of getNormalizedElementIds(doc, slideId)) {
          const element = getElement(doc, slideId, elementId)?.toJSON();
          if (element) {
            elements.push([elementId, element]);
          }
        }

        return {
          elements: getExportElements(elements),
          lock: getSlideLock(doc, slideId) ? {} : undefined,
        };
      }),
      // Only add files if there is at least one
      ...(files.length > 0 ? { files } : {}),
    },
  };
}

function getExportElements(elements: [string, Element][]): ElementExport[] {
  const elementIdSet = new Set<string>();

  for (const [_, element] of elements) {
    const ids: string[] = [];
    // Export the ids of the connected elements
    if (element.type === 'shape' && element.connectedPaths) {
      ids.push(...element.connectedPaths);
    } else if (element.type === 'path') {
      if (element.connectedElementStart) {
        ids.push(element.connectedElementStart);
      }
      if (element.connectedElementEnd) {
        ids.push(element.connectedElementEnd);
      }
    }

    // Export the ids of the frames and attached elements
    if (element.type === 'frame') {
      if (element.attachedElements) {
        ids.push(...element.attachedElements);
      }
    } else if (element.attachedFrame) {
      ids.push(element.attachedFrame);
    }

    for (const id of ids) {
      elementIdSet.add(id);
    }
  }

  return elements.map(([elementId, element]) => {
    let newElement: Element;
    if (Object.hasOwn(element, 'id')) {
      newElement = {
        ...element,
      };
      delete (newElement as Record<string, unknown>).id;
    } else {
      newElement = element;
    }

    let exportElement: ElementExport;
    if (elementIdSet.has(elementId)) {
      exportElement = {
        id: elementId,
        ...newElement,
      };
    } else {
      exportElement = newElement;
    }

    return exportElement;
  });
}

async function exportFiles(
  doc: SharedMap<WhiteboardDocument>,
  widgetApi: WidgetApi,
): Promise<WhiteboardFileExport[]> {
  const fileExportPromises = downloadFiles(doc, widgetApi);
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
  widgetApi: WidgetApi,
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
      promises.push(downloadFile(element, widgetApi));
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
  widgetApi: WidgetApi,
): Promise<WhiteboardFileExport> {
  const mxc = element.get('mxc');

  try {
    return await downloadUsingWidgetApi(widgetApi, mxc);
  } catch (error) {
    if (error instanceof WidgetApiActionError) {
      return await fallbackDownload(mxc, widgetApi.widgetParameters.baseUrl);
    } else {
      throw error;
    }
  }
}

async function downloadUsingWidgetApi(
  widgetApi: WidgetApi,
  mxc: string,
): Promise<WhiteboardFileExport> {
  try {
    const result = await widgetApi.downloadFile(mxc);
    return processDownloadResult(result, mxc);
  } catch {
    throw new WidgetApiActionError('downloadFile not available');
  }
}

async function fallbackDownload(
  mxc: string,
  baseUrl: string | undefined,
): Promise<WhiteboardFileExport> {
  if (baseUrl === null) {
    throw new Error(`Widget baseUrl parameter not set`);
  }

  const url = convertMxcToHttpUrl(mxc, baseUrl!);
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
  return processDownloadResult({ file: blob }, mxc);
}

async function processDownloadResult(
  result: IDownloadFileActionFromWidgetResponseData,
  mxc: string,
): Promise<WhiteboardFileExport> {
  if (!(result.file instanceof Blob)) {
    throw new Error('Got non Blob file response');
  }

  const data = await convertBlobToBase64(result.file);
  return {
    mxc,
    data,
  };
}
