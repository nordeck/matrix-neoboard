/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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

import emojiRegex from 'emoji-regex';
import { get } from 'lodash';
import { CanvasElement, Content, ContentText } from 'pdfmake/interfaces';
import tinycolor2 from 'tinycolor2';
import { ImageElement, ShapeElement } from '../../../state';
import { ElementRenderProperties } from '../../Whiteboard';
import { getTextSize } from '../../Whiteboard/ElementBehaviors/Text/fitText';

export function canvas(element: CanvasElement): Content {
  return {
    canvas: [element],
    unbreakable: true,
    absolutePosition: { x: 0, y: 0 },
  };
}

export function image(element: ImageElement, base64content: string): Content {
  const dataURL = 'data:' + element.mimeType + ';base64,' + base64content;
  return {
    image: dataURL,
    width: element.width,
    height: element.height,
    absolutePosition: { x: element.position.x, y: element.position.y },
  };
}

export function conv2png(element: ImageElement, base64content: string): string {
  const img = new Image();
  img.src = 'data:' + element.mimeType + ';base64,' + base64content;

  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = [element.width, element.height];

  const ctx = canvas.getContext('2d') ?? new CanvasRenderingContext2D();
  ctx.drawImage(img, 0, 0, element.width, element.height);

  return canvas.toDataURL('image/png').split(',')[1];
}

export function textContent(
  element: ShapeElement,
  textProperties: NonNullable<ElementRenderProperties['text']>,
): Content {
  if (!element.text) {
    return [];
  }

  const { fontSize, paddingTop } = getTextSize(
    textProperties.width,
    textProperties.height,
    { innerText: element.text },
    { disableLigatures: true, fontFamily: 'Inter,"Noto Emoji"' },
  );

  const regex = emojiRegex();

  const emojis = element.text.match(regex);
  const texts = element.text.split(regex);

  const text = texts.flatMap((t, idx) => {
    const emoji = get(emojis, idx - 1);

    return [
      ...(emoji !== undefined ? [{ text: emoji, style: 'emoji' }] : []),
      ...(t.length > 0 ? [t] : []),
    ];
  });

  const textContent: ContentText = {
    text,
    alignment: textProperties.alignment,
    color: findForegroundColor(element.fillColor),
    fontSize,
    lineHeight: 1,
    margin: 0,
    font: 'Inter',
  };

  return {
    layout: 'noBorders',
    table: {
      body: [[textContent]],
      widths: [textProperties.width],
      heights: [textProperties.height - paddingTop],
    },

    absolutePosition: {
      x: textProperties.position.x,
      y: textProperties.position.y + paddingTop,
    },
    unbreakable: true,
  };
}

function findForegroundColor(backgroundColor: string) {
  return tinycolor2(backgroundColor).isLight() ||
    tinycolor2(backgroundColor).getAlpha() === 0
    ? '#000'
    : '#fff';
}
