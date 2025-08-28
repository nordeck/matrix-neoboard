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

import { useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  calculateBoundingRectForElements,
  Elements,
  useWhiteboardSlideInstance,
} from '../../../state';
import { duplicate } from '../../ElementBar/DuplicateActiveElementButton/DuplicateActiveElementButton';
import { gridCellSize } from '../../Whiteboard';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';
import { selectActiveAndAttachedElementsInDocumentOrder } from '../utils';

export function DuplicateShortcut() {
  const slideInstance = useWhiteboardSlideInstance();

  const handleDuplicate = useCallback(() => {
    const elements =
      selectActiveAndAttachedElementsInDocumentOrder(slideInstance);
    const boundingRect = calculateBoundingRectForElements(
      Object.values(elements),
    );
    const duplicatedElements: Elements = {};
    for (const [elementId, element] of Object.entries(elements)) {
      duplicatedElements[elementId] = duplicate(
        element,
        gridCellSize,
        boundingRect,
      );
    }
    slideInstance.addElementsWithRelations(duplicatedElements);
  }, [slideInstance]);

  useHotkeys(
    ['ctrl+d', 'meta+d'],
    handleDuplicate,
    {
      preventDefault: true,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
    },
    [handleDuplicate],
  );

  return null;
}
