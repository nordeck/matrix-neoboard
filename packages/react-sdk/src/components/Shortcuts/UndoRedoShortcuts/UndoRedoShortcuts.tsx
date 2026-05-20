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

  useHotkeys(
    isMacOS() ? 'meta+z' : 'ctrl+z',
    (e) => {
      if (isViewingPresentation) {
        return;
      }
      // this is a workaround for non qwerty keyboards
      // see issue here: https://github.com/PostHog/code/issues/1797
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
    'ctrl+y',
    () => {
      if (isViewingPresentation) {
        return;
      }

      whiteboardInstance.redo();
    },
    {
      scopes: HOTKEY_SCOPE_WHITEBOARD,
      enableOnContentEditable: true,
      enabled: !isMacOS(),
    },
  );

  return null;
}
