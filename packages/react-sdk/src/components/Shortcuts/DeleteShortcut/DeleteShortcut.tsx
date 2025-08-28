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
import { useWhiteboardSlideInstance } from '../../../state';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';

export function DeleteShortcut() {
  const slideInstance = useWhiteboardSlideInstance();

  const handleDelete = useCallback(() => {
    const activeElementIds = slideInstance.getActiveElementIds();
    if (activeElementIds.length > 0) {
      slideInstance.removeElements(activeElementIds);
    }
  }, [slideInstance]);

  useHotkeys(
    'delete, backspace',
    handleDelete,
    {
      preventDefault: true,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
    },
    [handleDelete],
  );

  return null;
}
