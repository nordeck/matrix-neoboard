/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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
import {
  useActiveElements,
  useElements,
  useWhiteboardSlideInstance,
} from '../../state';
import { calculateTextUnderlineUpdates } from './calculateTextUnderlineUpdates';

type useToggleUnderlineResult = {
  /**
   * True, if at least one active element has underline text.
   */
  isUnderline: boolean;
  /**
   * Toggle underline text of active elements.
   */
  toggleUnderline: () => void;
};

export function useToggleUnderline(): useToggleUnderlineResult {
  const slideInstance = useWhiteboardSlideInstance();
  const { activeElementIds } = useActiveElements();
  const activeElements = useElements(activeElementIds);
  const elements = Object.values(activeElements);

  let isUnderline = false;

  for (const element of elements) {
    if (element.type === 'shape' && element.textUnderline !== undefined) {
      isUnderline = element.textUnderline;
      break;
    }
  }

  const toggleUnderline = useCallback(() => {
    const updates = calculateTextUnderlineUpdates(activeElements, !isUnderline);

    if (updates.length > 0) {
      slideInstance.updateElements(updates);
    }
  }, [activeElements, isUnderline, slideInstance]);

  return {
    isUnderline,
    toggleUnderline,
  };
}
