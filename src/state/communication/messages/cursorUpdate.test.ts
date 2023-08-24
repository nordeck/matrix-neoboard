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

import { isValidCursorUpdateMessage } from './cursorUpdate';

describe('isValidCursorUpdateMessage', () => {
  it('should accept message', () => {
    expect(
      isValidCursorUpdateMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id',
        content: {
          slideId: 'slide-id',
          position: { x: 1, y: 2 },
        },
        type: 'net.nordeck.whiteboard.cursor_update',
      }),
    ).toBe(true);
  });

  it('should accept additional properties', () => {
    expect(
      isValidCursorUpdateMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id',
        content: {
          slideId: 'slide-id',
          position: { x: 1, y: 2, additional: 'tmp' },
          additional: 'tmp',
        },
        type: 'net.nordeck.whiteboard.cursor_update',
      }),
    ).toBe(true);
  });

  it.each<Object>([
    { slideId: undefined },
    { slideId: null },
    { slideId: 111 },
    { slideId: '' },
    { position: undefined },
    { position: null },
    { position: 111 },
    { position: '' },
    { position: {} },
    { position: { x: undefined, y: 2 } },
    { position: { x: null, y: 2 } },
    { position: { x: '1', y: 2 } },
    { position: { x: 1, y: undefined } },
    { position: { x: 1, y: null } },
    { position: { x: 1, y: '2' } },
  ])('should reject message with patch %j', (patch: Object) => {
    expect(
      isValidCursorUpdateMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id',
        content: {
          slideId: 'slide-id',
          position: { x: 1, y: 2 },
          ...patch,
        },
        type: 'net.nordeck.whiteboard.cursor_update',
      }),
    ).toBe(false);
  });
});
