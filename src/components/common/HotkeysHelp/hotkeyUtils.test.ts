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

import { t } from 'i18next';
import { formatKey, parseHotKeys, splitHotKeys } from './hotkeyUtils';

describe('splitHotKeys', () => {
  it('should split hotkeys', () => {
    expect(splitHotKeys('Ctrl+S,Shift+Alt+Space , A')).toEqual([
      'Ctrl+S',
      'Shift+Alt+Space',
      'A',
    ]);
  });
});

describe('parseHotKeys', () => {
  it('should parse hotkeys', () => {
    expect(parseHotKeys('Shift+Alt+Space')).toEqual(['shift', 'alt', 'space']);
  });
});

describe('formatKey', () => {
  it.each`
    key             | output
    ${'arrowup'}    | ${'↑'}
    ${'arrowright'} | ${'→'}
    ${'arrowdown'}  | ${'↓'}
    ${'arrowleft'}  | ${'←'}
    ${'ctrl'}       | ${'Ctrl'}
    ${'shift'}      | ${'Shift'}
    ${'alt'}        | ${'Alt'}
    ${'meta'}       | ${'⌘'}
    ${'space'}      | ${'Space'}
    ${'enter'}      | ${'Enter'}
    ${'backspace'}  | ${'←'}
    ${'delete'}     | ${'Del'}
    ${'escape'}     | ${'Esc'}
    ${'a'}          | ${'A'}
    ${'1'}          | ${'1'}
  `('should format $key key as $output', ({ key, output }) => {
    expect(formatKey(key, t)).toBe(output);
  });

  it.each`
    key            | output
    ${'ctrl'}      | ${'⌃'}
    ${'shift'}     | ${'⇧'}
    ${'alt'}       | ${'⌥'}
    ${'meta'}      | ${'⌘'}
    ${'space'}     | ${'␣'}
    ${'enter'}     | ${'⏎'}
    ${'backspace'} | ${'⌫'}
    ${'delete'}    | ${'⌦'}
  `('should format $key key as $output on Mac', ({ key, output }) => {
    jest.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue('Mac OS');

    expect(formatKey(key, t)).toBe(output);
  });
});
