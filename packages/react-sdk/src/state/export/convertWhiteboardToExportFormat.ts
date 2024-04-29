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

import { isDefined } from '../../lib';
import {
  getElement,
  getNormalizedElementIds,
  getNormalizedSlideIds,
  getSlideLock,
  WhiteboardDocument,
} from '../crdt';
import { SharedMap } from '../crdt/y';
import { WhiteboardDocumentExport } from './whiteboardDocumentExport';

export function convertWhiteboardToExportFormat(
  doc: SharedMap<WhiteboardDocument>,
): WhiteboardDocumentExport {
  return {
    version: 'net.nordeck.whiteboard@v1',
    whiteboard: {
      slides: getNormalizedSlideIds(doc).map((slideId) => ({
        elements: getNormalizedElementIds(doc, slideId)
          .map((elementId) => getElement(doc, slideId, elementId)?.toJSON())
          .filter(isDefined),
        lock: getSlideLock(doc, slideId) ? {} : undefined,
      })),
    },
  };
}
