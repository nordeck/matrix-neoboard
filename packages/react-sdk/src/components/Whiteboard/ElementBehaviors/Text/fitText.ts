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

export function fitText(
  element: HTMLElement,
  fontWeightBold = false,
  fontStyleItalic = false,
) {
  const width = element.clientWidth;
  const height = element.clientHeight;

  const { fontSize, paddingTop, paddingHorizontal } = getTextSize(
    width,
    height,
    {
      innerHTML: element.innerHTML,
      innerText: element.innerText,
    },
    {
      fontWeightBold,
      fontStyleItalic,
    },
  );

  element.style.fontSize = `${fontSize}px`;
  element.style.padding = `${paddingTop}px ${paddingHorizontal}em 0`;
}

export function getTemporaryElement(): {
  textElement: HTMLElement;
  wrapperElement: HTMLElement;
} {
  const textId = 'fitTextTextElement';
  const wrapperId = 'fitTextWrapperElement';

  const textElement = document.getElementById(textId);
  const wrapperElement = document.getElementById(wrapperId);
  if (textElement && wrapperElement) {
    return { textElement, wrapperElement };
  } else {
    const hiddenElement = document.createElement('div');
    hiddenElement.style.overflow = 'hidden';
    hiddenElement.style.height = '0px';
    hiddenElement.style.width = '0px';
    hiddenElement.style.visibility = 'hidden';
    hiddenElement.style.display = 'flex';
    document.body.appendChild(hiddenElement);

    const wrapperElement = document.createElement('div');
    wrapperElement.id = wrapperId;
    wrapperElement.style.flexShrink = '0';

    hiddenElement.appendChild(wrapperElement);

    const textElement = document.createElement('div');
    textElement.id = textId;

    wrapperElement.appendChild(textElement);

    return { textElement, wrapperElement };
  }
}

export function getTextSize(
  width: number,
  height: number,
  content: { innerHTML?: string; innerText: string },
  opts: {
    disableLigatures?: boolean;
    fontFamily?: string;
    fontWeightBold?: boolean;
    fontStyleItalic?: boolean;
  } = {},
): {
  fontSize: number;
  paddingTop: number;
  paddingHorizontal: number;
} {
  width = Math.round(width);
  height = Math.round(height);

  const { textElement: element, wrapperElement } = getTemporaryElement();

  wrapperElement.style.flexBasis = `${width}px`;

  element.style.lineHeight = '1.2';
  element.style.wordBreak = 'unset';
  element.style.overflowWrap = 'unset';
  element.style.textAlign = 'center';
  element.style.fontWeight = opts.fontWeightBold ? 'bold' : 'normal';
  element.style.fontStyle = opts.fontStyleItalic ? 'italic' : 'normal';
  element.style.overflow = 'visible';
  element.style.fontVariantLigatures = opts?.disableLigatures
    ? 'none'
    : 'unset';
  element.style.fontFamily = opts.fontFamily ?? 'unset';

  if (content.innerHTML) {
    element.innerHTML = content.innerHTML;
  } else {
    element.innerText = content.innerText;
  }

  // add horizontal padding to balance the italic font style
  const paddingHorizontal = opts.fontStyleItalic ? 0.2 : 0;
  element.style.padding = `0 ${paddingHorizontal}em`;

  // Do a binary search to find the best matching text size, in a few steps
  let stepSize = maxFontSize - minFontSize;
  let fontSize = minFontSize;

  for (let i = 0; i < maxSteps; ++i) {
    const lastFontSize = fontSize;
    stepSize /= 2;
    fontSize = clamp(fontSize + stepSize, minFontSize, maxFontSize);

    element.style.fontSize = `${Math.round(fontSize)}px`;

    const { width: scrollWidth, height: scrollHeight } =
      element.getBoundingClientRect();

    const fits = scrollWidth <= width && scrollHeight <= height;

    if (!fits) {
      fontSize = lastFontSize;
    }
  }

  fontSize = Math.round(fontSize);

  element.style.fontSize = `${fontSize}px`;

  // calculate the padding to center the text in the box
  const paddingTop = Math.max(0, (height - element.clientHeight) / 2);

  element.innerText = '';

  return { fontSize, paddingTop, paddingHorizontal };
}
