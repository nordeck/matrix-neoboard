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

import { Elements, ElementUpdate } from '../../state';

/**
 * Calculate the text underline updates for all shape elements.
 *
 * @param elements - Elements for which the text underline is to be calculated for
 * @param textUnderline - The desired value for the text underline property
 * @returns List of element updates
 */
export function calculateTextUnderlineUpdates(
  elements: Elements,
  textUnderline: boolean,
): ElementUpdate[] {
  const updates: ElementUpdate[] = [];

  for (const [elementId, element] of Object.entries(elements)) {
    if (element.type !== 'shape' || !!element.textUnderline === textUnderline) {
      continue;
    }

    updates.push({ elementId, patch: { textUnderline } });
  }

  return updates;
}
