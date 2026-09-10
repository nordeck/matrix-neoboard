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
import { matrixRtcParticipantIdentity } from './matrixRtcParticipantIdentity';

describe('matrixRtcParticipantIdentity', () => {
  it('should return identity as in msc4195', async () => {
    const result = await matrixRtcParticipantIdentity(
      '@alice:example.com',
      'DEVICE123',
      'memberABC',
    );
    expect(result).toBe('J+T45tGruxc+HrUOqJJlyQSV33m728Cme4+vt8/SWrU');
  });

  it('should return identity for @user-id:example.com', async () => {
    const result = await matrixRtcParticipantIdentity(
      '@user-id:example.com',
      'DEVICE1',
      'memberA',
    );
    expect(result).toBe('vtdiVgWoeLb2NR7dph94uv/R4+U6uQTmCYE9Q0BlgUw');
  });

  it('should return identity for @another-user-id:example.com', async () => {
    const result = await matrixRtcParticipantIdentity(
      '@another-user-id:example.com',
      'DEVICE2',
      'memberB',
    );
    expect(result).toBe('sBDICto7qQGve1yoevllcuYOnxSoJ9wpRP6XJ8e1rB0');
  });
});
