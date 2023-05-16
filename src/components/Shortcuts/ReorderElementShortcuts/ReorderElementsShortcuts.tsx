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

import { first, last } from 'lodash';
import { useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  useActiveElement,
  useSlideElementIds,
  useWhiteboardSlideInstance,
} from '../../../state';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';

export function ReorderElementsShortcuts() {
  const { activeElementId } = useActiveElement();
  const slideInstance = useWhiteboardSlideInstance();
  const elementIds = useSlideElementIds();

  const canMoveUp = activeElementId && last(elementIds) !== activeElementId;
  const canMoveDown = activeElementId && first(elementIds) !== activeElementId;

  const handleClickBringForward = useCallback(() => {
    if (activeElementId && canMoveUp) {
      slideInstance.moveElementUp(activeElementId);
    }
  }, [activeElementId, canMoveUp, slideInstance]);

  const handleClickBringBackward = useCallback(() => {
    if (activeElementId && canMoveDown) {
      slideInstance.moveElementDown(activeElementId);
    }
  }, [activeElementId, canMoveDown, slideInstance]);

  useHotkeys(
    ['ctrl+arrowup', 'meta+arrowup'],
    handleClickBringForward,
    {
      preventDefault: true,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
    },
    [handleClickBringForward]
  );

  useHotkeys(
    ['ctrl+arrowdown', 'meta+arrowdown'],
    handleClickBringBackward,
    {
      preventDefault: true,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
    },
    [handleClickBringBackward]
  );

  return null;
}
