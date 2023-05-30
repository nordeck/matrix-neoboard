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
import { ShapeElement } from '../../../state';
import { ElementRenderProperties } from '../../Whiteboard';
import { getTextSize } from '../../Whiteboard/ElementBehaviors/Text/fitText';

export function canvas(element: CanvasElement): Content {
  return {
    canvas: [element],
    unbreakable: true,
    absolutePosition: { x: 0, y: 0 },
  };
}

export function textContent(
  element: ShapeElement,
  textProperties: NonNullable<ElementRenderProperties['text']>
): Content {
  if (!element.text) {
    return [];
  }

  const { fontSize, paddingTop } = getTextSize(
    textProperties.width,
    textProperties.height,
    { innerText: element.text },
    { disableLigatures: true, fontFamily: 'Inter,"Noto Emoji"' }
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
    alignment: 'center',
    color: findForegroundColor(element.fillColor),
    fontSize,
    lineHeight: 1 / 1.2,
    margin: 0,
    font: 'Inter',
    fontFeatures: ['tnum'],
  };

  // TODO: There are differences in the text layout of CSS and we try correct for those. It is not
  //       perfectly centered vertically due to: https://github.com/bpampuch/pdfmake/issues/74
  const verticalCorrection = fontSize * (1 - 1 / 1.2);

  return {
    layout: 'noBorders',
    table: {
      body: [[textContent]],
      widths: [textProperties.width],
      heights: [textProperties.height - paddingTop],
    },

    absolutePosition: {
      x: textProperties.position.x,
      y: textProperties.position.y + paddingTop - verticalCorrection,
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
