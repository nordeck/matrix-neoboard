/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

import React from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { useToggleBold, useToggleItalic } from '../../../lib/text-formatting';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';

export const TextFormattingShortcuts: React.FC = function () {
  const { toggleBold } = useToggleBold();
  const { toggleItalic } = useToggleItalic();

  useHotkeys(
    ['ctrl+b', 'meta+b'],
    toggleBold,
    {
      preventDefault: true,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
    },
    [toggleBold],
  );

  useHotkeys(
    ['ctrl+i', 'meta+i'],
    toggleItalic,
    {
      preventDefault: true,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
    },
    [toggleItalic],
  );

  return null;
};
