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

import { TFunction } from 'i18next';
import { isMacOS } from '../platform';

export function splitHotKeys(keys: string): string[] {
  return keys.split(/\s*,\s*/);
}

export function parseHotKeys(key: string): string[] {
  return key.split('+').map((k) => k.toLowerCase());
}

export function formatKey(key: string, t: TFunction): string {
  if (key === 'ctrl') {
    if (isMacOS()) {
      return t('hotKeysHelp.ctrl', '⌃', { context: 'macos' });
    } else {
      return t('hotKeysHelp.ctrl', 'Ctrl', { context: 'default' });
    }
  } else if (key === 'shift') {
    if (isMacOS()) {
      return t('hotKeysHelp.shift', '⇧', { context: 'macos' });
    } else {
      return t('hotKeysHelp.shift', 'Shift', { context: 'default' });
    }
  } else if (key === 'alt') {
    if (isMacOS()) {
      return t('hotKeysHelp.alt', '⌥', { context: 'macos' });
    } else {
      return t('hotKeysHelp.alt', 'Alt', { context: 'default' });
    }
  } else if (key === 'meta') {
    return t('hotKeysHelp.meta', '⌘', { context: 'macos' });
  } else if (key === 'space') {
    if (isMacOS()) {
      return t('hotKeysHelp.space', '␣', { context: 'macos' });
    } else {
      return t('hotKeysHelp.space', 'Space', { context: 'default' });
    }
  } else if (key === 'arrowdown') {
    return t('hotKeysHelp.arrowDown', '↓');
  } else if (key === 'arrowup') {
    return t('hotKeysHelp.arrowUp', '↑');
  } else if (key === 'arrowleft') {
    return t('hotKeysHelp.arrowLeft', '←');
  } else if (key === 'arrowright') {
    return t('hotKeysHelp.arrowRight', '→');
  } else if (key === 'enter') {
    if (isMacOS()) {
      return t('hotKeysHelp.enter', '⏎', { context: 'macos' });
    } else {
      return t('hotKeysHelp.enter', 'Enter', { context: 'default' });
    }
  } else if (key === 'backspace') {
    if (isMacOS()) {
      return t('hotKeysHelp.backspace', '⌫', { context: 'macos' });
    } else {
      return t('hotKeysHelp.backspace', '←', { context: 'default' });
    }
  } else if (key === 'delete') {
    if (isMacOS()) {
      return t('hotKeysHelp.delete', '⌦', { context: 'macos' });
    } else {
      return t('hotKeysHelp.delete', 'Del', { context: 'default' });
    }
  } else if (key === 'escape') {
    return t('hotKeysHelp.escape', 'Esc');
  }

  return key.toUpperCase();
}
