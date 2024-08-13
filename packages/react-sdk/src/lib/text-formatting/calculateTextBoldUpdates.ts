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

import { Elements, ElementUpdate } from '../../state/types';

/**
 * Calculate the text bold updates for all shape elements.
 *
 * @param elements - Elements for which the text bold is to be calculated for
 * @param textBold - The desired value for the text bold property
 * @returns List of element updates
 */
export function calculateTextBoldUpdates(
  elements: Elements,
  textBold: boolean,
): ElementUpdate[] {
  const updates: ElementUpdate[] = [];

  for (const [elementId, element] of Object.entries(elements)) {
    if (element.type !== 'shape' || !!element.textBold === textBold) {
      continue;
    }

    updates.push({ elementId, patch: { textBold } });
  }

  return updates;
}
