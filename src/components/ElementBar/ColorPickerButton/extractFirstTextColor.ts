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

import { findForegroundColor, isEmptyText } from '../../../lib';
import { Element } from '../../../state';

/**
 * Extract the text color of the first element with a text.
 * Prefer the color of an element with a non-empty text.
 * Otherwise fall back to the default color of any element with a text prop.
 *
 * @param elements - Elements from which the text color should be extracted
 * @returns Text color of undefined if no element that can have a text is found
 */
export function extractFirstTextColor(elements: Element[]): string | undefined {
  for (const element of elements) {
    if ('text' in element && !isEmptyText(element.text)) {
      return (
        // The element has an explicit color set, return it
        element.textColor ??
        // The element has no color, calculate one with a good contrast
        findForegroundColor(element.fillColor)
      );
    }
  }

  return undefined;
}
