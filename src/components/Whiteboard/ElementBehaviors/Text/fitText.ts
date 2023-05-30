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

const minFontSize = 10;
const maxFontSize = 800;
const maxSteps = 10;

export function fitText(element: HTMLElement) {
  const width = element.clientWidth;
  const height = element.clientHeight;

  const { fontSize, paddingTop } = getTextSize(width, height, {
    innerHTML: element.innerHTML,
    innerText: element.innerText,
  });

  element.style.fontSize = `${fontSize}px`;
  element.style.paddingTop = `${paddingTop}px`;
}

export function getTemporaryElement(): HTMLElement {
  const id = 'fitTextTemporaryElement';

  const el = document.getElementById(id);
  if (el) {
    return el;
  } else {
    const wrapper = document.createElement('div');
    wrapper.style.overflow = 'hidden';
    wrapper.style.height = '0px';
    wrapper.style.width = '0px';
    wrapper.style.visibility = 'hidden';

    const d = document.createElement('div');
    d.id = 'fitTextTemporaryElement';

    wrapper.appendChild(d);
    document.body.appendChild(wrapper);

    return d;
  }
}

export function getTextSize(
  width: number,
  height: number,
  content: { innerHTML?: string; innerText: string },
  opts: { disableLigatures?: boolean; fontFamily?: string } = {}
): {
  fontSize: number;
  paddingTop: number;
} {
  width = Math.round(width);
  height = Math.round(height);

  const element = getTemporaryElement();
  element.style.width = `${width}px`;

  element.style.lineHeight = '1';
  element.style.wordBreak = 'unset';
  element.style.overflowWrap = 'unset';
  element.style.textAlign = 'center';
  element.style.overflow = 'visible';
  element.style.fontFeatureSettings = '"tnum" 1';
  element.style.fontVariantLigatures = opts?.disableLigatures
    ? 'none'
    : 'unset';
  element.style.fontFamily = opts.fontFamily ?? 'unset';

  if (content.innerHTML) {
    element.innerHTML = content.innerHTML;
  } else {
    element.innerText = content.innerText;
  }

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

  fontSize = Math.round(fontSize);

  element.style.fontSize = `${fontSize}px`;

  // calculate the padding to center the text in the box
  const paddingTop = Math.max(0, (height - element.clientHeight) / 2);

  element.innerText = '';

  return { fontSize, paddingTop };
}
