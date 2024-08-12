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

import {
  ChangeFn,
  generateAddElement,
  generateAddSlide,
  generateLockSlide,
  generateMoveSlide,
  generateRemoveSlide,
  getNormalizedSlideIds,
  WhiteboardDocument,
} from '../crdt';
import { WhiteboardDocumentExport } from './whiteboardDocumentExport';

/**
 * Load a whiteboard from an export file.
 *
 * @param whiteboard - The new whiteboard from the export file
 * @param ownUserId - The current user's ID, used for locks
 * @param atSlideIndex - If set, the new whiteboard will not replace the existing data.
 */
export function generateLoadWhiteboardFromExport(
  whiteboard: WhiteboardDocumentExport,
  ownUserId: string,
  atSlideIndex?: number,
): ChangeFn<WhiteboardDocument> {
  return (doc) => {
    if (atSlideIndex === undefined) {
      const oldSlideIds = getNormalizedSlideIds(doc);
      oldSlideIds.forEach((slideId) => {
        const removeSlide = generateRemoveSlide(slideId);
        removeSlide(doc);
      });
    }

    whiteboard.whiteboard.slides.forEach((slide, index) => {
      const [addSlide, slideId] = generateAddSlide();
      addSlide(doc);

      slide.elements.forEach((element) => {
        const [addElement] = generateAddElement(slideId, element);
        addElement(doc);
      });

      if (atSlideIndex !== undefined) {
        const moveSlide = generateMoveSlide(slideId, atSlideIndex + index);
        moveSlide(doc);
      }

      if (slide.lock) {
        const lockSlide = generateLockSlide(slideId, ownUserId);
        lockSlide(doc);
      }
    });
  };
}
