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

import { useCallback } from 'react';
import {
  useActiveElements,
  useElements,
  useWhiteboardSlideInstance,
} from '../../state';
import { calculateTextItalicUpdates } from './calculateTextItalicUpdates';

type UseToggleItalicResult = {
  /**
   * True, if at least one active element has italic text.
   */
  isItalic: boolean;
  /**
   * Toggle bold text of active elements.
   */
  toggleItalic: () => void;
};

export function useToggleItalic() {
  const slideInstance = useWhiteboardSlideInstance();
  const { activeElementIds } = useActiveElements();
  const activeElements = useElements(activeElementIds);
  const elements = Object.values(activeElements);

  let isItalic = false;

  for (const element of elements) {
    if (element.type === 'shape' && element.textItalic !== undefined) {
      isItalic = element.textItalic;
      break;
    }
  }

  const toggleItalic = useCallback(() => {
    const updates = calculateTextItalicUpdates(activeElements, !isItalic);

    if (updates.length > 0) {
      slideInstance.updateElements(updates);
    }
  }, [activeElements, isItalic, slideInstance]);

  return {
    isItalic,
    toggleItalic,
  };
}
