/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { KeyboardEvent, useCallback, useRef } from 'react';
import { useHotkeysContext } from 'react-hotkeys-hook';
import { usePresentationMode } from '../../../state';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';
import { gridCellSize } from '../constants';
import { useSvgScaleContext } from '../SvgScaleContext';

type UseArrowKeys = {
  handleKeyDown: (e: KeyboardEvent) => void;
  handleKeyUp: (e: KeyboardEvent) => void;
};

export function useArrowKeys(): UseArrowKeys {
  const { scale, updateTranslation } = useSvgScaleContext();

  const { state: presentationState } = usePresentationMode();
  const isPresentationMode = presentationState.type !== 'idle';
  // Do avoid issues where users are interacting the content editable part
  // of the whiteboard canvas, we should disable our listeners.
  const { activeScopes } = useHotkeysContext();
  const enableShortcuts =
    activeScopes.includes(HOTKEY_SCOPE_WHITEBOARD) && !isPresentationMode;
  const pressedKeys = useRef<Set<string>>(new Set());

  const getKeyboardOffset = useCallback(() => {
    const scrollStep = gridCellSize * scale;
    let dx = 0;
    let dy = 0;

    if (pressedKeys.current.has('ArrowUp')) dy += scrollStep;
    if (pressedKeys.current.has('ArrowDown')) dy -= scrollStep;
    if (pressedKeys.current.has('ArrowLeft')) dx += scrollStep;
    if (pressedKeys.current.has('ArrowRight')) dx -= scrollStep;

    return { dx, dy };
  }, [scale]);

  // Apply keyboard navigation offset if needed
  const applyKeyboardNavigation = useCallback(() => {
    const { dx, dy } = getKeyboardOffset();
    if (dx !== 0 || dy !== 0) {
      updateTranslation(dx, dy);
    }
  }, [getKeyboardOffset, updateTranslation]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (enableShortcuts && isArrowKey(e.key)) {
        if (!pressedKeys.current.has(e.key)) {
          pressedKeys.current.add(e.key);
        }
        e.preventDefault();
        applyKeyboardNavigation();
      }
    },
    [applyKeyboardNavigation, enableShortcuts],
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      if (enableShortcuts && isArrowKey(e.key)) {
        pressedKeys.current.delete(e.key);
        e.preventDefault();
        applyKeyboardNavigation();
      }
    },
    [applyKeyboardNavigation, enableShortcuts],
  );

  return {
    handleKeyDown,
    handleKeyUp,
  };
}

function isArrowKey(key: string): boolean {
  return ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key);
}
