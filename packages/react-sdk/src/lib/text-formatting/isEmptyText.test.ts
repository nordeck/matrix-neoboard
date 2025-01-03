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

import { describe, expect, it } from 'vitest';
import { isEmptyText } from './isEmptyText';

describe('isEmptyText', () => {
  it('should return true for an empty string', () => {
    expect(isEmptyText('')).toBe(true);
  });

  it('should return true for a string with only spaces', () => {
    expect(isEmptyText('   ')).toBe(true);
  });

  it('should return true for a string with only tabs', () => {
    expect(isEmptyText('\t\t\t')).toBe(true);
  });

  it('should return true for a string with only newlines', () => {
    expect(isEmptyText('\n\n\n')).toBe(true);
  });

  it('should return false for a non-empty string', () => {
    expect(isEmptyText('Hello')).toBe(false);
  });

  it('should return false for a string with non-whitespace characters and spaces', () => {
    expect(isEmptyText('  Hello  ')).toBe(false);
  });

  it('should return false for a string with mixed whitespace and non-whitespace characters', () => {
    expect(isEmptyText(' \t\nHello\n\t ')).toBe(false);
  });
});
