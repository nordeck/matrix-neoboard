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

import { describe, expect, it } from 'vitest';
import { scalePathD } from './svgPathDUtils';

describe('scalePathD', () => {
  it('should scale an absolute line path', () => {
    expect(scalePathD('M0,0 L10,10', 2, 3)).toBe('M0,0 L20,30');
  });

  it('should scale a relative line path', () => {
    expect(scalePathD('m0,0 l10,10', 2, 3)).toBe('m0,0 l20,30');
  });

  it('should scale implicit repeated "M" coordinate pairs as "L"', () => {
    expect(scalePathD('M0,0 10,10 20,0', 2, 2)).toBe('M0,0 L20,20 L40,0');
  });

  it('should scale a cubic bezier curve', () => {
    expect(scalePathD('M0,0 C1,2 3,4 5,6 Z', 2, 5)).toBe(
      'M0,0 C2,10,6,20,10,30 Z',
    );
  });

  it('should scale a quadratic bezier and smooth curve commands', () => {
    expect(scalePathD('M0,0 Q1,2 3,4 S5,6 7,8', 2, 3)).toBe(
      'M0,0 Q2,6,6,12 S10,18,14,24',
    );
  });

  it('should scale horizontal and vertical line commands independently', () => {
    expect(scalePathD('M0,0 H10 V20', 2, 3)).toBe('M0,0 H20 V60');
  });

  it('should scale the radii and endpoint of an arc command', () => {
    expect(scalePathD('M0,0 A5,10,0,1,1,20,30', 2, 3)).toBe(
      'M0,0 A10,30,0,1,1,40,90',
    );
  });

  it('should flip the arc sweep flag when only one axis is mirrored', () => {
    expect(scalePathD('M0,0 A5,10,0,1,1,20,30', -2, 3)).toBe(
      'M0,0 A10,30,0,1,0,-40,90',
    );
  });

  it('should handle negative coordinates and scale factors below one', () => {
    expect(scalePathD('M-10,-20 L10,20', 0.5, 0.5)).toBe('M-5,-10 L5,10');
  });

  it('should round scaled values to 5 decimal places', () => {
    expect(scalePathD('M1,1 L2,2', 1 / 3, 1 / 3)).toBe(
      'M0.33333,0.33333 L0.66667,0.66667',
    );
  });

  it('should return an empty string for an empty path', () => {
    expect(scalePathD('', 2, 2)).toBe('');
  });

  it('should throw for an unknown command', () => {
    expect(() => scalePathD('X1,2', 2, 2)).toThrow(
      'Unsupported SVG path command "X"',
    );
  });

  it('should throw when a command is missing its arguments', () => {
    expect(() => scalePathD('M1,2 L3', 2, 2)).toThrow(
      'Invalid path data: not enough arguments for command "L"',
    );
  });
});
