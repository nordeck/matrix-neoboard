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
 * @return Looks for the first element in the list without a transparent colour. If found it returns this color.
 *         Otherwise it falls back to the colour of the first element, that may also be "transparent".
 *         Returns undefined if the colour cannot be determined.
 */
export const extractFirstNonTransparentOrFirstColor = (
  elements: Elements,
): string | undefined => {
  const values = Object.values(elements);
  const colorElement =
    values.find((element) => {
      if (element.type === 'shape' && element.fillColor !== 'transparent') {
        return true;
      }

      if (element.type === 'path' && element.strokeColor !== 'transparent') {
        return true;
      }

      return false;
    }) ?? values[0];

  return colorElement?.type === 'path'
    ? colorElement?.strokeColor
    : colorElement?.fillColor;
};
