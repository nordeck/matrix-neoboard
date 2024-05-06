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
 * Extracts the first color of the elements, if available.
 * Otherwise returns "undefined".
 *
 * @param elements - elements to search for a color
 * @returns first color or "undefined"
 */
export function extractFirstColor(elements: Element[]): string | undefined {
  for (const element of elements) {
    if (element.type === 'shape') {
      return element.fillColor;
    }

    if (element.type === 'path') {
      return element.strokeColor;
    }
  }

  return undefined;
}
