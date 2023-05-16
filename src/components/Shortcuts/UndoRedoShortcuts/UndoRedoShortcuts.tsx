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

import { useHotkeys } from 'react-hotkeys-hook';
import { usePresentationMode, useWhiteboardManager } from '../../../state';
import { isMacOS } from '../../common/platform';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';

export function UndoRedoShortcuts() {
  const whiteboardManager = useWhiteboardManager();
  const { state: presentationState } = usePresentationMode();
  const isViewingPresentation = presentationState.type === 'presentation';

  useHotkeys(
    isMacOS() ? 'meta+z' : 'ctrl+z',
    (keyboardEvent) => {
      if (isViewingPresentation) {
        return;
      }

      // react-hotkeys-hook will not properly handle different keyboard layouts
      // on at least windows. We explicitly recheck if the key z was pressed until
      // this is fixed in https://github.com/JohannesKlauss/react-hotkeys-hook/issues/909.
      if (keyboardEvent.key === 'z') {
        whiteboardManager.getActiveWhiteboardInstance()?.undo();
      }
    },
    { scopes: HOTKEY_SCOPE_WHITEBOARD, enableOnContentEditable: true },
    [isViewingPresentation, whiteboardManager]
  );

  useHotkeys(
    isMacOS() ? ['meta+shift+z'] : ['ctrl+shift+z', 'ctrl+y'],
    (keyboardEvent, hotkeysEvent) => {
      if (isViewingPresentation) {
        return;
      }

      // react-hotkeys-hook will not properly handle different keyboard layouts
      // on at least windows. We explicitly recheck if the key y was pressed until
      // this is fixed in https://github.com/JohannesKlauss/react-hotkeys-hook/issues/909.
      if (hotkeysEvent.shift || keyboardEvent.key === 'y') {
        whiteboardManager.getActiveWhiteboardInstance()?.redo();
      }
    },
    { scopes: HOTKEY_SCOPE_WHITEBOARD, enableOnContentEditable: true },
    [isViewingPresentation, whiteboardManager]
  );

  return null;
}
