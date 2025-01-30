/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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
import { TextFontFamily } from '../../state/crdt/documents/elements';
import { calculateFontFamilyUpdates } from './calculateFontFamilyUpdates';

type UseFontFamilyResult = {
  fontFamily?: TextFontFamily;
  setFontFamily: (value?: TextFontFamily) => void;
};

export function useFontFamily(): UseFontFamilyResult {
  const slideInstance = useWhiteboardSlideInstance();
  const { activeElementIds } = useActiveElements();
  const activeElements = useElements(activeElementIds);
  const elements = Object.values(activeElements);

  let fontFamily: TextFontFamily | undefined = 'Inter';

  for (const element of elements) {
    if (element.type === 'shape') {
      // Find first shape textFont
      fontFamily = element.textFontFamily;
      break;
    }
  }

  const setFontFamily = useCallback(
    (value?: TextFontFamily) => {
      const updates = calculateFontFamilyUpdates(activeElements, value);

      if (updates.length > 0) {
        slideInstance.updateElements(updates);
      }
    },
    [activeElements, slideInstance],
  );

  return {
    fontFamily,
    setFontFamily,
  };
}
