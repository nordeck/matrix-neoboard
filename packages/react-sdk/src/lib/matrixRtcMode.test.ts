/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

import { afterEach, beforeEach, describe, expect, it, Mock, vi } from 'vitest';
import { normalizeMatrixUserId } from './matrixRtcMode';

vi.mock('@matrix-widget-toolkit/mui', () => ({
  getEnvironment: vi.fn(),
}));

import { getEnvironment } from '@matrix-widget-toolkit/mui';

describe('normalizeMatrixUserId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('returns unchanged if not a valid MXID in MatrixRTC mode', () => {
    (getEnvironment as Mock).mockReturnValue('matrixrtc');

    expect(normalizeMatrixUserId('@user:example.com')).toBe(
      '@user:example.com',
    );
  });

  it('returns userId unchanged if not in MatrixRTC mode', () => {
    (getEnvironment as Mock).mockReturnValue('webrtc');

    expect(normalizeMatrixUserId('@user:example.com')).toBe(
      '@user:example.com',
    );
    expect(normalizeMatrixUserId('@user:example.com:sessionId')).toBe(
      '@user:example.com:sessionId',
    );
  });

  it('return userId if in MatrixRTC mode and it has more than two parts', () => {
    (getEnvironment as Mock).mockReturnValue('matrixrtc');

    expect(normalizeMatrixUserId('@user:example.com')).toBe(
      '@user:example.com',
    );
    expect(normalizeMatrixUserId('@user:example.com:sessionId')).toBe(
      '@user:example.com',
    );
    expect(normalizeMatrixUserId('@user:example.com:session:extra')).toBe(
      '@user:example.com',
    );
  });
});
