/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { clamp } from 'lodash';

export function fitText(
  element: HTMLElement,
  {
    minFontSize = 10,
    maxFontSize = 800,
    maxSteps = 10,
  }: { minFontSize?: number; maxFontSize?: number; maxSteps?: number } = {}
) {
  const width = element.clientWidth;
  const height = element.clientHeight;

  // unset the height and reset the padding that we set in a previous execution
  const previousHeight = element.style.height;
  element.style.height = 'unset';
  element.style.paddingTop = 'unset';

  // Do a binary search to find the best matching text size, in a few steps
  let stepSize = maxFontSize - minFontSize;
  let fontSize = minFontSize;

  for (let i = 0; i < maxSteps; ++i) {
    const lastFontSize = fontSize;
    stepSize /= 2;
    fontSize = clamp(fontSize + stepSize, minFontSize, maxFontSize);

    element.style.fontSize = `${Math.round(fontSize)}px`;

    const fits = element.scrollWidth <= width && element.scrollHeight <= height;

    if (!fits) {
      fontSize = lastFontSize;
    }
  }

  element.style.fontSize = `${Math.round(fontSize)}px`;

  // calculate the padding to center the text in the box
  const paddingTop = `${Math.max(0, (height - element.clientHeight) / 2)}px`;
  element.style.paddingTop = paddingTop;

  // restore the height
  element.style.height = previousHeight;
}
