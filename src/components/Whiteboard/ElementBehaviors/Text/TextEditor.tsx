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
import {
  Dispatch,
  DispatchWithoutAction,
  MouseEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { useFontsLoaded } from '../../../../lib';
import {
  HOTKEY_SCOPE_WHITEBOARD,
  usePauseHotkeysScope,
} from '../../../WhiteboardHotkeysProvider';
import { fitText } from './fitText';

type EditableProps = {
  editMode: boolean;
  contentEditable: boolean;
};

const Editable = styled('div', {
  shouldForwardProp: (p) => p !== 'editMode',
})<EditableProps>(({ editMode, contentEditable }) => ({
  lineHeight: 1.2,
  wordBreak: 'unset',
  wordWrap: 'unset',
  overflowWrap: 'unset',
  textAlign: 'center',
  height: '100%',
  // Selection only works in edit mode
  userSelect: editMode ? 'initial' : 'none',
  cursor: editMode ? 'text' : 'inherit',
  // We disabled pointer event on the outer container, enable it here again
  pointerEvents: contentEditable ? 'all' : 'none',
  // Hide the caret till we are actually editing
  caretColor: editMode ? 'inherit' : 'transparent',
  // We need the overflow to trigger scrollWidth/scrollHeight changes for fitText
  overflow: 'visible',
  // Remove UA styling
  outline: '0px solid transparent !important',
  boxShadow: 'none !important',
}));

const setCaretToTheEnd = (element: HTMLDivElement) => {
  let lastChild = element.lastChild;

  if (lastChild) {
    // Find the nested last child
    while (lastChild.lastChild) {
      lastChild = lastChild.lastChild;
    }

    const position = lastChild.textContent?.length ?? 0;
    const range = document.createRange();
    const selection = window.getSelection();
    range.setStart(lastChild, position);
    range.setEnd(lastChild, position);
    range.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
};

export type TextEditorProps = {
  content: string;
  editable?: boolean;
  color: string;
  onChange: Dispatch<string>;
  onBlur: DispatchWithoutAction;
  width: number;
  height: number;
  editModeOnMount: boolean;
};

// TODO: Consider an alternative to content-editable. Right now it allows to do unexpected things
// like formatting, or tables. However, these aren't persisted.

export function TextEditor({
  content,
  editable = false,
  color,
  onChange,
  onBlur,
  width,
  height,
  editModeOnMount = false,
}: TextEditorProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const [isEditMode, setEditMode] = useState(editModeOnMount);
  usePauseHotkeysScope(HOTKEY_SCOPE_WHITEBOARD, isEditMode && editable);

  useEffect(() => {
    if (!editable && isEditMode) {
      onBlur();

      setEditMode(false);
    }
  }, [editable, isEditMode, onBlur]);

  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      if (editable || isEditMode) {
        event.stopPropagation();
      }

      if (editable) {
        setEditMode(true);
      } else {
        event.preventDefault();
      }
    },
    [editable, isEditMode]
  );

  const handleFocus = useCallback(() => {
    if (textRef.current) {
      setCaretToTheEnd(textRef.current);
    }
  }, [textRef]);

  const handleMouseEvents = useCallback(
    (event: MouseEvent) => {
      if (isEditMode) {
        event.stopPropagation();
      } else {
        event.preventDefault();
      }
    },
    [isEditMode]
  );

  const handleKeyDown = useCallback(() => {
    // We defer till the next rerender to make sure that the content was updated
    // as part of this keystroke.
    window.requestAnimationFrame(() => {
      if (textRef.current) {
        fitText(textRef.current);
      }
    });
  }, [textRef]);

  const handleKeyUp = useCallback(() => {
    if (textRef.current) {
      const newContent = textRef.current.innerText;

      if (content !== newContent) {
        setEditMode(true);

        onChange(newContent);
      }
    }
  }, [textRef, content, onChange]);

  useLayoutEffect(() => {
    if (textRef.current && textRef.current.innerText !== content) {
      textRef.current.innerText = content;
    }
  }, [textRef, content]);

  useLayoutEffect(() => {
    if (textRef.current && editable) {
      // It's not possible to focus the editable intermediately, we have to
      // plan it for the next event.
      const timeout = setTimeout(() => textRef.current?.focus(), 0);
      return () => clearTimeout(timeout);
    }
  }, [textRef, editable]);

  const fontsLoaded = useFontsLoaded();

  useLayoutEffect(() => {
    // Every time content or the shape changes, re-calculate the perfect font size
    if (textRef.current) {
      fitText(textRef.current);
    }
  }, [
    textRef,
    content,
    // Width, height, and fontsLoaded are used to trigger calculating the size
    width,
    height,
    fontsLoaded,
  ]);

  return (
    <Editable
      style={{ color }}
      contentEditable={editable}
      editMode={isEditMode}
      onBlur={onBlur}
      onClick={handleMouseEvents}
      onDoubleClick={handleDoubleClick}
      onFocus={handleFocus}
      onKeyDownCapture={handleKeyDown}
      onKeyUpCapture={handleKeyUp}
      onMouseDown={handleMouseEvents}
      onMouseMove={handleMouseEvents}
      onMouseUp={handleMouseEvents}
      ref={textRef}
      suppressContentEditableWarning
    />
  );
}
