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
 * Calculates the updates to update element colours.
 *
 * @param elements - Elements to update the colours of
 * @param color - Colour to apply
 * @returns List of updates to apply the colour
 */
export function calculateColorChangeUpdates(
  elements: Elements,
  color: string,
): ElementUpdate[] {
  const updates = [];

  for (const [elementId, element] of Object.entries(elements)) {
    if (element?.type === 'path') {
      updates.push({
        elementId,
        patch: {
          strokeColor: color,
        },
      });
    } else if (
      element?.type === 'shape' &&
      // skip transparent shape elements because they are texts without a colour
      element.fillColor !== 'transparent'
    ) {
      updates.push({
        elementId,
        patch: {
          fillColor: color,
        },
      });
    }
  }

  return updates;
}
