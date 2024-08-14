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
import { TextAlignment, useWhiteboardSlideInstance } from '../../../../state';
import { TextEditor } from './TextEditor';

export type ForeignObjectNoInteractionProps = {
  paddingTop?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingBottom?: number;
};

const ForeignObjectNoInteraction = styled('foreignObject')({
  // disable the pointer events because the foreignObject is always square
  // while the actual element might be a triangle or a circle.
  pointerEvents: 'none',
});

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

  // If text editing is exited before the blur is received force a submit
  useUnmount(handleBlur);

  // Edit mode on mount only for empty text fields
  const editModeOnMount =
    activeElement?.type === 'shape' &&
    activeElement?.kind === 'rectangle' &&
    activeElement.fillColor === 'transparent' &&
    activeElement.text.trim() === '';

  return (
    <ForeignObjectNoInteraction x={x} y={y} height={height} width={width}>
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
      />
    </ForeignObjectNoInteraction>
  );
};
