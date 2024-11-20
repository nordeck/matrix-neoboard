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
  element.style.padding = `${paddingTop}px ${paddingHorizontal}px 0`;
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
  textWidth: number;
} {
  width = Math.round(width);
  height = Math.round(height);
  const canvas = new OffscreenCanvas(1, 1);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('2D context not available');
  }

  const fontFamily = opts.fontFamily || 'sans-serif';
  const minFontSize = 1;
  const maxFontSize = 800;
  let fontSize = minFontSize;
  const maxSteps = 10;
  const paddingHorizontal = opts.fontStyleItalic ? 0.2 : 0;
  let stepSize = maxFontSize - minFontSize;
  const safetyMargin = 5;

  for (let i = 0; i < maxSteps; ++i) {
    const lastFontSize = fontSize;
    stepSize /= 2;
    fontSize = Math.max(minFontSize, Math.min(fontSize + stepSize, maxFontSize));

    const { width: textWidth, height: textHeight } = measureText(context, content.innerText, fontSize, fontFamily);

    const fits = textWidth <= (width - (paddingHorizontal * 2) - safetyMargin) && textHeight <= (height / 2 - safetyMargin);

    if (!fits) {
      fontSize = lastFontSize;
    }
  }

  fontSize = Math.round(fontSize);

  const paddingTop = height / 2 - fontSize / 2;
  const { width: textWidth } = measureText(context, content.innerText, fontSize, fontFamily);

  return {
    fontSize,
    paddingTop,
    paddingHorizontal,
    textWidth,
  };
}
function measureText(context: OffscreenCanvasRenderingContext2D, text: string, fontSize: number, fontFamily: string): { width: number, height: number } {
  context.font = `${fontSize}px ${fontFamily}`;
  const metrics = context.measureText(text);
  const textHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  return { width: metrics.width, height: textHeight };
}
