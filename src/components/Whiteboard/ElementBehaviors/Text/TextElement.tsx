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
import tinycolor2 from 'tinycolor2';
import { ShapeElement, useWhiteboardSlideInstance } from '../../../../state';
import { useMeasure } from '../../SvgCanvas';
import { TextEditor } from './TextEditor';

function findForegroundColor(backgroundColor: string) {
  return tinycolor2(backgroundColor).isLight() ||
    tinycolor2(backgroundColor).getAlpha() === 0
    ? '#000'
    : '#fff';
}

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

export type TextElementProps = ShapeElement & {
  active?: boolean;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  elementId: string;
};

export const TextElement = ({
  paddingTop = 0,
  paddingLeft = 0,
  paddingBottom = 0,
  paddingRight = 0,
  active,
  elementId,
  ...shape
}: TextElementProps) => {
  const [ref, { width, height }] = useMeasure<SVGForeignObjectElement>();
  const slideInstance = useWhiteboardSlideInstance();
  const [unsubmittedText, setUnsubmittedText] = useState<string>(shape.text);
  const activeElement = slideInstance.getElement(elementId);

  useEffect(() => {
    setUnsubmittedText(shape.text);
  }, [shape.text]);

  const handleTextChange = useCallback((text: string) => {
    setUnsubmittedText(text);
  }, []);

  const handleBlur = useCallback(() => {
    if (unsubmittedText !== shape.text) {
      // TODO: Implement concurrent editing of text
      slideInstance.updateElement(elementId, {
        text: unsubmittedText,
      });
    }
  }, [elementId, shape.text, slideInstance, unsubmittedText]);

  // If text editing is exited before the blur is received force a submit
  useUnmount(handleBlur);

  return (
    <ForeignObjectNoInteraction
      ref={ref}
      x={paddingLeft}
      y={paddingTop}
      height={shape.height - paddingTop - paddingBottom}
      width={shape.width - paddingLeft - paddingRight}
    >
      <TextEditor
        color={findForegroundColor(shape.fillColor)}
        content={unsubmittedText}
        editModeOnMount={
          activeElement?.type === 'shape' &&
          activeElement?.kind === 'rectangle' &&
          activeElement.fillColor === 'transparent'
        }
        editable={active}
        onBlur={handleBlur}
        onChange={handleTextChange}
        height={height}
        width={width}
      />
    </ForeignObjectNoInteraction>
  );
};
