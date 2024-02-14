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

import { Elements } from '../../../state/types';

/**
 * Extracts the first non-transparent colour of some elements, if available.
 * Returns "undefined" if there are no elements.
 * Otherwise returns the first non-transparent colour.
 * If there is no non-transparent colour it defaults to "transparent".
 *
 * @param elements - Elements to search for a colour
 * @returns undefined or first non-transparent colour or "transparent"
 */
export function extractFirstNonTransparentOrFirstColor(
  elements: Elements,
): string | undefined {
  const values = Object.values(elements);

  if (values.length === 0) {
    return undefined;
  }

  for (const element of values) {
    if (element.type === 'shape' && element.fillColor !== 'transparent') {
      return element.fillColor;
    }

    if (element.type === 'path' && element.strokeColor !== 'transparent') {
      return element.strokeColor;
    }
  }

  return 'transparent';
}
