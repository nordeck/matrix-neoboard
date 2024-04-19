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

import { ElementUpdate, Elements } from '../../../state/types';

/**
 * Create Element patches for text color updates
 * Only create patches for elements with a text and a color change.
 *
 * @param elements - Elements for which the updates are to be generated
 * @param color - Text color to set in the updates
 * @returns Element patches for text color updates
 */
export function calculateTextColorChangeUpdates(
  elements: Elements,
  color: string,
): ElementUpdate[] {
  const updates: ElementUpdate[] = [];

  for (const [elementId, element] of Object.entries(elements)) {
    if (
      element.type === 'shape' &&
      element.text.length > 0 &&
      element.textColor !== color
    ) {
      updates.push({
        elementId,
        patch: {
          textColor: color,
        },
      });
    }
  }

  return updates;
}
