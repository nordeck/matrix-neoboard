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

const t = (labelKey: string, labelDefault: string) => ({
  labelKey,
  labelDefault,
});

export const SHORTCUTS: ShortcutItem[] = [
  {
    ...t('helpCenter.shortcuts.elementOperations.selectAll', 'Select all'),
    keys: 'ctrl+a',
    macKeys: 'meta+a',
  },
  {
    ...t('helpCenter.shortcuts.elementOperations.escape', 'Unselect'),
    keys: 'escape',
  },
  {
    ...t(
      'helpCenter.shortcuts.elementOperations.cut',
      'Cut selected element(s)',
    ),
    keys: 'ctrl+x',
    macKeys: 'meta+x',
  },
  {
    ...t(
      'helpCenter.shortcuts.elementOperations.copy',
      'Copy selected element(s)',
    ),
    keys: 'ctrl+c',
    macKeys: 'meta+c',
  },
  {
    ...t('helpCenter.shortcuts.elementOperations.paste', 'Paste element(s)'),

    keys: 'ctrl+v',
    macKeys: 'meta+v',
  },
  {
    ...t(
      'helpCenter.shortcuts.elementOperations.duplicate',
      'Duplicate selected element(s)',
    ),
    keys: 'ctrl+d',
    macKeys: 'meta+d',
  },
  {
    ...t('helpCenter.shortcuts.elementOperations.undo', 'Undo'),
    keys: 'ctrl+z',
    macKeys: 'meta+z',
  },
  {
    ...t('helpCenter.shortcuts.elementOperations.redo', 'Redo'),
    keys: 'ctrl+y',
    macKeys: 'meta+shift+z',
  },
  {
    ...t(
      'helpCenter.shortcuts.elementOperations.reorder.up',
      'Move element one layer up',
    ),
    keys: 'ctrl+arrowup',
    macKeys: 'meta+arrowup',
  },
  {
    ...t(
      'helpCenter.shortcuts.elementOperations.reorder.down',
      'Move element one layer down',
    ),
    keys: 'ctrl+arrowdown',
    macKeys: 'meta+arrowdown',
  },
  {
    ...t(
      'helpCenter.shortcuts.elementOperations.reorder.front',
      'Move element(s) to front',
    ),
    keys: 'ctrl+shift+arrowup',
    macKeys: 'meta+shift+arrowup',
  },
  {
    ...t(
      'helpCenter.shortcuts.elementOperations.reorder.back',
      'Move element(s) to back',
    ),
    keys: 'ctrl+shift+arrowdown',
    macKeys: 'meta+shift+arrowdown',
  },
  {
    ...t(
      'helpCenter.shortcuts.elementOperations.move',
      'Move element(s) on the board',
    ),
    keys: ['arrowup', 'arrowdown', 'arrowleft', 'arrowright'],
  },
];
