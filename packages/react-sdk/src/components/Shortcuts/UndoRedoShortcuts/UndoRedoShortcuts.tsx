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
import {
  useActiveWhiteboardInstance,
  usePresentationMode,
} from '../../../state';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';
import { isMacOS } from '../../common/platform';

export function UndoRedoShortcuts() {
  const whiteboardInstance = useActiveWhiteboardInstance();
  const { state: presentationState } = usePresentationMode();
  const isViewingPresentation = presentationState.type === 'presentation';

  // react-hotkeys-hook matches by e.code (physical position) by default, which
  // breaks non-QWERTY layouts: on QWERTZ the Z key is at KeyY, so ctrl+z fires
  // on the Y key instead. useKey: true switches matching to e.key (character),
  // but the library's useKey path ignores modifiers (known bug, open PRs #1298/#1317
  // on react-hotkeys-hook). Workaround: register the bare key and check modifiers
  // manually so both layouts and modifier checks are handled correctly.
  useHotkeys(
    'z',
    (e) => {
      const hasModifier = isMacOS() ? e.metaKey : e.ctrlKey;
      if (!hasModifier || isViewingPresentation) {
        return;
      }
      if (e.shiftKey) {
        whiteboardInstance.redo();
      } else {
        whiteboardInstance.undo();
      }
    },
    {
      scopes: HOTKEY_SCOPE_WHITEBOARD,
      enableOnContentEditable: true,
      useKey: true,
    },
  );

  useHotkeys(
    'y',
    (e) => {
      if (!e.ctrlKey || isViewingPresentation) {
        return;
      }

      whiteboardInstance.redo();
    },
    {
      scopes: HOTKEY_SCOPE_WHITEBOARD,
      enableOnContentEditable: true,
      enabled: !isMacOS(),
      useKey: true,
    },
  );

  return null;
}
