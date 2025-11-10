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

import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { styled } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useUnmount } from 'react-use';
import { findForegroundColor } from '../../../../lib';
import {
  PathElement,
  TextAlignment,
  useWhiteboardSlideInstance,
} from '../../../../state';
import { TextFontFamily } from '../../../../state/crdt/documents/elements';
import { TextEditor } from './TextEditor';

export type ForeignObjectNoInteractionProps = {
  paddingTop?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingBottom?: number;
  fontFamily: TextFontFamily;
};

/**
 * Replace with Uint8Array.fromBase64() as soon as our TypeScript allows it.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/fromBase64
 */
function fromBase64(base64: string) {
  const raw = window.atob(base64);
  const rawLength = raw.length;
  const array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }
  return array.buffer;
}

const ForeignObjectNoInteraction = styled(
  'foreignObject',
)<ForeignObjectNoInteractionProps>(({ fontFamily }) => ({
  fontFamily: fontFamily,
  // disable the pointer events because the foreignObject is always square
  // while the actual element might be a triangle or a circle.
  pointerEvents: 'none',
}));

export type TextElementProps = {
  active?: boolean;
  text: string;
  textAlignment: TextAlignment;
  textBold: boolean;
  textItalic: boolean;

  x: number;
  y: number;
  width: number;
  height: number;

  fillColor: string;
  elementId: string;
  textColor?: string;
  fontSize?: number;
  fontFamily: TextFontFamily;

  setTextToolsEnabled: ((enabled: boolean) => void) | undefined;
};

export const TextElement = ({
  active,
  text,
  textAlignment,
  textBold,
  textItalic,
  x,
  y,
  width,
  height,
  fillColor,
  elementId,
  textColor,
  fontSize,
  fontFamily,
  setTextToolsEnabled,
}: TextElementProps) => {
  const slideInstance = useWhiteboardSlideInstance();
  const [unsubmittedText, setUnsubmittedText] = useState(text);
  const activeElement = slideInstance.getElement(elementId);
  const color = textColor ?? findForegroundColor(fillColor);
  const widgetApi = useWidgetApi();

  useEffect(() => {
    setUnsubmittedText(text);
  }, [text]);

  const handleTextChange = useCallback((text: string) => {
    setUnsubmittedText(text);
  }, []);

  const handleBlur = useCallback(() => {
    if (unsubmittedText !== text) {
      // TODO: Implement concurrent editing of text
      slideInstance.updateElement(elementId, {
        text: unsubmittedText,
      });
    }
  }, [elementId, slideInstance, text, unsubmittedText]);

  const handleAICompletion = useCallback(async () => {
    const allElements = Object.values(
      slideInstance.getElements(
        slideInstance.getElementIds().filter((id) => id !== elementId),
      ),
    );
    // Find all incoming lines
    const incomingConnections = allElements.filter((element) => {
      if (
        element.type !== 'path' ||
        element.endMarker !== 'arrow-head-line' ||
        element.kind !== 'line'
      ) {
        return false;
      }
      const endX = element.position.x + element.points[1].x;
      const endY = element.position.y + element.points[1].y;
      return endX > x && endY > y && endX < x + width && endY < y + height;
    }) as PathElement[];
    // Find all shapes which are the origin of an incoming line
    const incomingShapes = allElements.filter((element) => {
      if (element.type !== 'shape' || !element.text) {
        return false;
      }
      for (const line of incomingConnections) {
        if (
          line.position.x + line.points[0].x > element.position.x &&
          line.position.y + line.points[0].y > element.position.y &&
          line.position.x + line.points[0].x <
            element.position.x + element.width &&
          line.position.y + line.points[0].y <
            element.position.y + element.height
        ) {
          return true;
        }
      }
    });
    // If there are no incoming shapes, give the user a hint.
    if (incomingShapes.length === 0) {
      slideInstance.updateElement(elementId, {
        text: 'Use arrows to point from other shapes to this one. Then press the robot for an AI message.',
      });
      return;
    }
    // Sort the shapes from left to right, then top to bottom to pretend the AI reads the page.
    incomingShapes
      .sort((a, b) => a.position.x - b.position.x)
      .sort((a, b) => a.position.y - b.position.y);
    console.log(incomingShapes);
    const elementWithModelStatement = incomingShapes.find(
      (element) =>
        element.type === 'shape' && element.text.startsWith('model: '),
    );
    const model =
      (elementWithModelStatement?.type === 'shape'
        ? elementWithModelStatement.text.slice('model: '.length).trim()
        : '') || 'o4-mini-2025-04-16';
    const prompt = incomingShapes
      .map((element) =>
        element.type === 'shape' && !element.text.startsWith('model: ')
          ? element.text.trim()
          : '',
      )
      .join('\n\n');
    slideInstance.updateElement(elementId, {
      text: 'Generating…',
    });
    // Ask the AI
    try {
      const service =
        model.startsWith('deepseek') ||
        model.startsWith('gemma') ||
        model.startsWith('gpt-oss') ||
        model.startsWith('llama') ||
        model.startsWith('mistral') ||
        model.startsWith('qwen')
          ? 'ollama'
          : (globalThis.localStorage.getItem('llm-service') ?? 'open-ai');
      let outputText: string;
      if (service === 'ollama') {
        const res = await fetch('http://localhost:11434/api/generate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt,
            stream: false,
          }),
        });
        if (!res.ok) {
          slideInstance.updateElement(elementId, {
            text: `HTTP error ${res.status}`,
          });
          return;
        }
        const data = await res.json();
        console.log(data);
        outputText = data.response.replace(/<think>.*?<\/think>\W*/gs, '');
      } else {
        const generateImage = text === 'image';
        if (generateImage) {
          const res = await fetch(
            'https://api.openai.com/v1/images/generations',
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${globalThis.localStorage.getItem('open-ai-api-token')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                model: 'dall-e-3',
                prompt,
                n: 1,
                response_format: 'b64_json',
                size: '1024x1024',
              }),
            },
          );
          if (!res.ok) {
            slideInstance.updateElement(elementId, {
              text: `HTTP error ${res.status}`,
            });
            return;
          }
          const data = await res.json();
          console.log(data);
          const data0 = data.data[0];
          let imageData: ArrayBuffer | undefined;
          if ('b64_json' in data0) {
            imageData = fromBase64(data.data[0].b64_json);
          }
          if (!imageData) {
            slideInstance.updateElement(elementId, {
              text: `The API responded, but we do not support the response yet.`,
            });
            return;
          }
          const uploadResult = await widgetApi.uploadFile(imageData);
          slideInstance.addElement({
            type: 'image',
            position: {
              x,
              y,
            },
            width,
            height: width,
            mxc: uploadResult.content_uri,
            mimeType: 'image/png',
            fileName: `${Date.now()}.png`,
          });
          slideInstance.updateElement(elementId, {
            text,
          });
          return;
        } else {
          const res = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${globalThis.localStorage.getItem('open-ai-api-token')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              input: `Answer in a short and precise way. Limit yourself to 2 sentences. ${prompt}`,
              stream: false,
            }),
          });
          if (!res.ok) {
            slideInstance.updateElement(elementId, {
              text: `HTTP error ${res.status}`,
            });
            return;
          }
          const data = await res.json();
          console.log(data);
          outputText = data.output
            .find((output: { type: string }) => output.type === 'message')
            .content.find(
              (content: { type: string }) => content.type === 'output_text',
            ).text;
        }
      }
      slideInstance.updateElement(elementId, {
        text: outputText,
      });
    } catch (err) {
      console.error(err);
      slideInstance.updateElement(elementId, {
        text: 'Try again later.',
      });
    }
  }, [elementId, slideInstance, x, y, width, height, text, widgetApi]);

  // If text editing is exited before the blur is received force a submit
  useUnmount(handleBlur);

  // Edit mode on mount only for empty text fields
  const editModeOnMount =
    activeElement?.type === 'shape' &&
    activeElement?.kind === 'rectangle' &&
    activeElement.fillColor === 'transparent' &&
    activeElement.text.trim() === '';

  // foreign object can't have negative dimensions
  if (height < 0 || width < 0) {
    return null;
  }

  return (
    <>
      <ForeignObjectNoInteraction
        x={x}
        y={y}
        height={height}
        width={width}
        fontFamily={fontFamily}
      >
        <TextEditor
          color={color}
          content={unsubmittedText}
          contentAlignment={textAlignment}
          contentBold={textBold}
          contentItalic={textItalic}
          editModeOnMount={editModeOnMount}
          editable={active}
          onBlur={handleBlur}
          onChange={handleTextChange}
          height={height}
          width={width}
          fontSize={fontSize}
          setTextToolsEnabled={setTextToolsEnabled}
        />
      </ForeignObjectNoInteraction>
      <text
        x={x + width + 16}
        y={y + 16}
        height={32}
        width={32}
        fontSize={28}
        onClick={handleAICompletion}
      >
        🤖
      </text>
    </>
  );
};
