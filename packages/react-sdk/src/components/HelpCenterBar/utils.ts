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

export type ShortcutItem = {
  labelKey: string;
  labelDefault: string;
  keys: string | string[];
  macKeys?: string | string[];
};

export const SHORTCUTS: ShortcutItem[] = [
  {
    labelKey: 'helpCenter.shortcuts.elementOperations.copy',
    labelDefault: 'Select all on whiteboard',
    keys: 'ctrl+a',
    macKeys: 'meta+a',
  },
  {
    labelKey: 'helpCenter.shortcuts.elementOperations.escape',
    labelDefault: 'Unselect',
    keys: 'escape',
  },
  {
    labelKey: 'helpCenter.shortcuts.elementOperations.undo',
    labelDefault: 'Undo',
    keys: 'ctrl+z',
    macKeys: 'meta+z',
  },
  {
    labelKey: 'helpCenter.shortcuts.elementOperations.redo',
    labelDefault: 'Redo',
    keys: 'ctrl+y',
    macKeys: 'meta+shift+z',
  },
  {
    labelKey: 'helpCenter.shortcuts.elementOperations.duplicate',
    labelDefault: 'Duplicate selected element(s)',
    keys: 'ctrl+d',
    macKeys: 'meta+d',
  },
  {
    labelKey: 'helpCenter.shortcuts.elementOperations.reorder.up',
    labelDefault: 'Move element one layer up',
    keys: 'ctrl+arrowup',
    macKeys: 'meta+arrowup',
  },
  {
    labelKey: 'helpCenter.shortcuts.elementOperations.reorder.down',
    labelDefault: 'Move element one layer down',
    keys: 'ctrl+arrowdown',
    macKeys: 'meta+arrowdown',
  },
  {
    labelKey: 'helpCenter.shortcuts.elementOperations.reorder.front',
    labelDefault: 'Move element(s) to front',
    keys: 'ctrl+shift+arrowup',
    macKeys: 'meta+shift+arrowup',
  },
  {
    labelKey: 'helpCenter.shortcuts.elementOperations.reorder.back',
    labelDefault: 'Move element(s) to back',
    keys: 'ctrl+shift+arrowdown',
    macKeys: 'meta+shift+arrowdown',
  },
  {
    labelKey: 'helpCenter.shortcuts.elementOperations.move',
    labelDefault: 'Move element(s) on the board',
    keys: ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'],
  },
];
