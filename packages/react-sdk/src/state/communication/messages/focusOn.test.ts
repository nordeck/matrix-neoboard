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

import { describe, expect, it } from 'vitest';
import { isValidFocusOnMessage } from './focusOn';

describe('isValidFocusOnMessage', () => {
  it('should accept message', () => {
    expect(
      isValidFocusOnMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id:example.com',
        content: {
          slideId: 'slide-id',
        },
        type: 'net.nordeck.whiteboard.focus_on',
      }),
    ).toBe(true);
  });

  it('should accept additional properties', () => {
    expect(
      isValidFocusOnMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id:example.com',
        content: {
          slideId: 'slide-id',
          additional: 'tmp',
        },
        type: 'net.nordeck.whiteboard.focus_on',
      }),
    ).toBe(true);
  });

  it.each<object>([
    { slideId: undefined },
    { slideId: null },
    { slideId: 111 },
    { slideId: '' },
  ])('should reject message with patch %j', (patch: object) => {
    expect(
      isValidFocusOnMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id:example.com',
        content: {
          slideId: 'slide-id',
          ...patch,
        },
        type: 'net.nordeck.whiteboard.focus_on',
      }),
    ).toBe(false);
  });
});
