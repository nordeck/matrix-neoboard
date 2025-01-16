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
import {
  base64ToMimeType,
  base64ToUint8Array,
  getSVGUnsafe,
} from '../../../imageUtils';
import { ImageElement, Point, ShapeElement } from '../../../state';
import { ElementRenderProperties } from '../../Whiteboard';
import { getTextSize } from '../../Whiteboard/ElementBehaviors/Text/fitText';

export function canvas(element: CanvasElement): Content {
  return {
    canvas: [element],
    unbreakable: true,
    absolutePosition: { x: 0, y: 0 },
  };
}

export function image(
  element: {
    position: Point;
    width: number;
    height: number;
  },
  base64content: string,
): Content {
  const mimeType = base64ToMimeType(base64content);
  const dataURL = 'data:' + mimeType + ';base64,' + base64content;
  return {
    image: dataURL,
    width: element.width,
    height: element.height,
    absolutePosition: { x: element.position.x, y: element.position.y },
  };
}

export function base64ToBlob(element: ImageElement, base64: string): Blob {
  const decoded = atob(base64);

  const fileToImage = (base64: string) => {
    const byteNumbers = base64ToUint8Array(base64);
    return new Blob([byteNumbers]);
  };

  try {
    const svgDom = getSVGUnsafe(decoded);
    // If it's not an svg we assume it's another image type
    if (svgDom.documentElement.tagName !== 'svg') {
      return fileToImage(base64);
    }

    // Add xmlns attribute if it's missing
    if (!svgDom.documentElement.getAttribute('xmlns')) {
      svgDom.documentElement.setAttribute(
        'xmlns',
        'http://www.w3.org/2000/svg',
      );
    }

    // Add width and height in case they are missing
    if (!svgDom.documentElement.getAttribute('width')) {
      svgDom.documentElement.setAttribute('width', element.width.toString());
    }
    if (!svgDom.documentElement.getAttribute('height')) {
      svgDom.documentElement.setAttribute('height', element.height.toString());
    }

    // Convert to a blob
    const svgString = new XMLSerializer().serializeToString(svgDom);
    return new Blob([svgString], { type: 'image/svg+xml' });
  } catch {
    // If DOMParser fails we assume it's not an svg
    return fileToImage(base64);
  }
}

function saveLoadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.addEventListener('load', () => resolve(img));

    img.addEventListener('error', (err) => reject(err));

    img.src = url;
  });
}

export async function conv2png(
  element: {
    width: number;
    height: number;
  },
  blob: Blob,
): Promise<string> {
  const blobUrl = URL.createObjectURL(blob);

  const img = await saveLoadImage(blobUrl);

  const canvas = document.createElement('canvas');
  [canvas.width, canvas.height] = [element.width, element.height];

  const ctx = canvas.getContext('2d') ?? new CanvasRenderingContext2D();
  ctx.drawImage(img, 0, 0, element.width, element.height);

  const dataURL = canvas.toDataURL('image/png').split(',')[1];
  if (!dataURL) {
    throw new Error('Failed to convert image to png');
  }
  return dataURL;
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
    {
      disableLigatures: true,
      fontFamily: 'Inter,"Noto Emoji"',
      fontSize: element.textSize,
    },
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
    // Set maxHeight to prevent text overflows.
    // This is not optimal, because it does not clip the text.
    // Instead it does not draw lines, that would not fit into the shape.
    // Uses element.height and not textProperties.height + padding to avoid being too strict and
    // cut things off, that should actually be there.
    // @ts-expect-error This does exist but is not yet part of @types/pdfmake
    maxHeight: element.height,
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
