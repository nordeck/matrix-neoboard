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
 * @param elements - Elements to search for a colour
 * @returns If there are no elements it returns undefined.
 *          Else the first non-transparent colour of the elements.
 *          Finally 'transparent' if there is no non-transparent colour.
 */
export const extractFirstNonTransparentOrFirstColor = (
  elements: Elements,
): string | undefined => {
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
};
