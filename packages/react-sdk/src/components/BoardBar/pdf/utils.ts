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

/**
 * This ensures that the svg is meeting the following conditions:
 *
 * - The width and height are set (required for the canvas to work)
 * - The svg is actually an svg
 *   - If the svg is not an svg we return the original string
 *   - If the svg is detected to be a png or jpeg we return the original string but set the mimetype accordingly
 *
 * @param element The element that is being processed
 * @param svg The base64 encoded svg string
 * @returns The base64 encoded svg string after the preprocessing
 */
function preprocessSvg(element: ImageElement, svg: string): string {
  if (element.mimeType !== 'image/svg+xml') {
    return svg;
  }

  // Convert the svg base64 to the actual svg
  const svgString = atob(svg);

  // We lied in the past about the mimetype, so we need to check if the svg is actually an svg and otherwise return the original string
  if (!svgString.includes('<svg')) {
    element.mimeType = svgString.includes('PNG') ? 'image/png' : 'image/jpeg';
    return svg;
  }

  // Parse the svg string
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svgElement = doc.documentElement;

  // Check if a size is set and if not set it to the size from the viewbox
  if (!svgElement.getAttribute('width') || !svgElement.getAttribute('height')) {
    const viewBox = svgElement.getAttribute('viewBox')?.split(' ');
    if (viewBox) {
      svgElement.setAttribute('width', viewBox[2]);
      svgElement.setAttribute('height', viewBox[3]);
    } else {
      svgElement.setAttribute('width', element.width.toString());
      svgElement.setAttribute('height', element.height.toString());
    }
  }

  // Convert the svg element to a string
  const serializer = new XMLSerializer();
  const svgStringProcessed = serializer.serializeToString(svgElement);

  // Convert the svg string to base64
  return btoa(svgStringProcessed);
}

export function conv2png(element: ImageElement, base64content: string): string {
  // If we have a svg image we need to preprocess it for the canvas to work
  if (element.mimeType === 'image/svg+xml') {
    base64content = preprocessSvg(element, base64content);
  }

  // If we now end up with a png or jpeg image we can return it early
  if (element.mimeType === 'image/png' || element.mimeType === 'image/jpeg') {
    return base64content;
  }

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
