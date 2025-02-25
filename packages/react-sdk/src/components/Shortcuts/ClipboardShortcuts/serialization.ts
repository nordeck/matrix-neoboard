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

import { Base64 } from 'js-base64';
import { Element, isValidElement } from '../../../state';
import { whiteboardHeight, whiteboardWidth } from '../../Whiteboard';

export type ClipboardContent = Partial<
  Record<'text/plain' | 'text/html', string>
>;

export type WhiteboardClipboardContent = {
  elements?: Element[];
};

export function serializeToClipboard(
  content: WhiteboardClipboardContent,
): ClipboardContent {
  return {
    'text/html': serializeAsHtml(content),
    'text/plain': serializeAsPlainText(content),
  };
}

export function deserializeFromClipboard(
  content: ClipboardContent,
): WhiteboardClipboardContent {
  if (content['text/html']) {
    const { elements } = deserializeFromHtml(content['text/html']);

    if (elements) {
      return { elements };
    }
  }

  if (content['text/plain']) {
    const { elements } = deserializeFromHtml(content['text/plain']);

    if (elements) {
      return { elements };
    }

    return deserializeFromPlainText(content['text/plain']);
  }

  return {};
}

export function serializeAsPlainText({
  elements,
}: WhiteboardClipboardContent): string {
  if (!elements) {
    return '';
  }

  return elements
    .map((element) => {
      if (element.type !== 'shape') {
        return '';
      }

      return element.text;
    })
    .filter((t) => t.length > 0)
    .join(' ');
}

export function deserializeFromPlainText(
  text: string,
): WhiteboardClipboardContent {
  const width = 600;
  const height = 300;

  // If user adds plain text, we just embed it into a shape.
  // TODO: In the future we might want to use a text element instead of a
  // rectangle
  return {
    elements: [
      {
        type: 'shape',
        kind: 'rectangle',
        position: {
          x: (whiteboardWidth - width) / 2,
          y: (whiteboardHeight - height) / 2,
        },
        height,
        width,
        text,
        fillColor: 'transparent',
        textFontFamily: 'Inter',
      },
    ],
  };
}

const HTML_METADATA_START = '<--(net.nordeck.whiteboard)';
const HTML_METADATA_END = '(/net.nordeck.whiteboard)-->';

export function serializeAsHtml(content: WhiteboardClipboardContent): string {
  const elementsText =
    content.elements
      ?.map((element) =>
        escapeTextAsHtml(serializeAsPlainText({ elements: [element] })),
      )
      .filter((text) => text.length > 0)
      .map((text) => `<div>${text}</div>`)
      .join('') ?? '';
  const encodedJson = Base64.encode(JSON.stringify(content));

  // When serializing our JSON, we pack it into the HTML version. Tools like
  // Figma and Miro do it similar. If the user inserts the content into another
  // application, like a rich text editor, he still gets the visible text.
  return `<span data-meta="${HTML_METADATA_START}${encodedJson}${HTML_METADATA_END}"></span>${elementsText}`;
}

export function deserializeFromHtml(
  content: string,
): WhiteboardClipboardContent {
  const metadataStartIndex = content.indexOf(HTML_METADATA_START);

  if (metadataStartIndex < 0) {
    return {};
  }

  const metadataEndIndex = content.indexOf(HTML_METADATA_END);

  if (metadataEndIndex < 0) {
    return {};
  }

  const encodedJson = content.substring(
    metadataStartIndex + HTML_METADATA_START.length,
    metadataEndIndex,
  );

  try {
    const data = JSON.parse(Base64.decode(encodedJson));

    if (typeof data !== 'object') {
      return {};
    }

    if (Array.isArray(data.elements)) {
      const elements = data.elements.filter(isValidElement);
      return { elements };
    }

    return {};
  } catch {
    return {};
  }
}

export function escapeTextAsHtml(text: string): string {
  const element = document.createElement('div');

  text.split(/\n|\r|\r\n/).forEach((part, index) => {
    if (index > 0) {
      element.appendChild(document.createElement('br'));
    }

    element.appendChild(document.createTextNode(part));
  });

  return element.innerHTML;
}
