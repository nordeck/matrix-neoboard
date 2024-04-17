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

import { Element } from '../../../state';

/**
 * Extracts the first non-transparent color of the elements, if available.
 * Otherwise returns "transparent" if elements are not empty.
 * Otherwise returns "undefined".
 *
 * @param elements - elements to search for a color
 * @returns first non-transparent color or "transparent" or "undefined"
 */
export function extractFirstNonTransparentOrFirstColor(
  elements: Element[],
): string | undefined {
  if (elements.length === 0) {
    return undefined;
  }

  for (const element of elements) {
    if (element.type === 'shape' && element.fillColor !== 'transparent') {
      return element.fillColor;
    }

    if (element.type === 'path' && element.strokeColor !== 'transparent') {
      return element.strokeColor;
    }
  }

  return 'transparent';
}
