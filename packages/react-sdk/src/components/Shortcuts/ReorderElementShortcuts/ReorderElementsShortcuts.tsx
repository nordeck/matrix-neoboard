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

import { useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  useActiveElements,
  useCanMoveActiveElementOneStep,
  useWhiteboardSlideInstance,
} from '../../../state';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';

export function ReorderElementsShortcuts() {
  const { activeElementIds } = useActiveElements();
  const slideInstance = useWhiteboardSlideInstance();
  const { canMoveUp, canMoveDown } =
    useCanMoveActiveElementOneStep(activeElementIds);

  const handleClickBringForward = useCallback(() => {
    if (canMoveUp) {
      slideInstance.moveElementUp(activeElementIds[0]);
    }
  }, [activeElementIds, canMoveUp, slideInstance]);

  const handleClickBringBackward = useCallback(() => {
    if (canMoveDown) {
      slideInstance.moveElementDown(activeElementIds[0]);
    }
  }, [activeElementIds, canMoveDown, slideInstance]);

  // A single element that can move one step can also move to the top/bottom
  const canMoveTop = canMoveUp || activeElementIds.length > 1;
  const canMoveBottom = canMoveDown || activeElementIds.length > 1;

  const handleClickBringToFront = useCallback(() => {
    if (canMoveTop) {
      slideInstance.moveElementsToTop(activeElementIds);
    }
  }, [activeElementIds, canMoveTop, slideInstance]);

  const handleClickBringToBack = useCallback(() => {
    if (canMoveBottom) {
      slideInstance.moveElementsToBottom(activeElementIds);
    }
  }, [activeElementIds, canMoveBottom, slideInstance]);

  useHotkeys(
    ['ctrl+arrowup', 'meta+arrowup'],
    handleClickBringForward,
    {
      preventDefault: true,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
    },
    [handleClickBringForward],
  );

  useHotkeys(
    ['ctrl+arrowdown', 'meta+arrowdown'],
    handleClickBringBackward,
    {
      preventDefault: true,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
    },
    [handleClickBringBackward],
  );

  useHotkeys(
    ['ctrl+shift+arrowup', 'meta+shift+arrowup'],
    handleClickBringToFront,
    {
      preventDefault: true,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
    },
    [handleClickBringToFront],
  );

  useHotkeys(
    ['ctrl+shift+arrowdown', 'meta+shift+arrowdown'],
    handleClickBringToBack,
    {
      preventDefault: true,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
    },
    [handleClickBringToBack],
  );

  return null;
}
