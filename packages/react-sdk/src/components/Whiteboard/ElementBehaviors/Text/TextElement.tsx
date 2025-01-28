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

import { styled } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useUnmount } from 'react-use';
import { findForegroundColor } from '../../../../lib';
import { PathElement, TextAlignment, useWhiteboardSlideInstance } from '../../../../state';
import { TextFontFamily } from '../../../../state/crdt/documents/elements';
import { TextEditor } from './TextEditor';

export type ForeignObjectNoInteractionProps = {
  paddingTop?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingBottom?: number;
  fontFamily: TextFontFamily;
};

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
        : '') || 'llama3.2';
    const prompt = incomingShapes
      .map((element) =>
        element.type === 'shape' && !element.text.startsWith('model: ')
          ? element.text.trim()
          : '',
      )
      .join('\n\n');
    slideInstance.updateElement(elementId, {
      text: '...',
    });
    // Ask the AI
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
    const text = data.response.replace(/<think>.*?<\/think>\W*/gs, '');
    slideInstance.updateElement(elementId, {
      text,
    });
  }, [elementId, slideInstance, x, y, width, height]);

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
