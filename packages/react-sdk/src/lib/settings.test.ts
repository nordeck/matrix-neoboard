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

import { beforeEach, describe, expect, it } from 'vitest';
import { getSetting, setSetting } from './settings';

beforeEach(() => {
  localStorage.clear();
});

describe('getSetting', () => {
  it('should read setting from local storage', () => {
    localStorage.setItem('my-setting', '"EXAMPLE"');

    expect(getSetting('my-setting')).toBe('EXAMPLE');
  });

  it('should return default value if setting is not in local storage', () => {
    expect(getSetting('my-setting', 'DEFAULT')).toBe('DEFAULT');
  });

  it('should return default value if setting from local storage is no valid json', () => {
    localStorage.setItem('my-setting', 'not-json');

    expect(getSetting('my-setting', 'DEFAULT')).toBe('DEFAULT');
  });
});

describe('setSetting', () => {
  it('should write setting to local storage', () => {
    setSetting('my-setting', { my: 'value' });

    expect(localStorage.getItem('my-setting')).toBe('{"my":"value"}');
  });
});
