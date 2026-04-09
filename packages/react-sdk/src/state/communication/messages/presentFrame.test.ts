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
import { isValidPresentFrameMessage } from './presentFrame';

describe('isValidPresentFrameMessage', () => {
  it('should accept message', () => {
    expect(
      isValidPresentFrameMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id:example.com',
        content: {},
        type: 'net.nordeck.whiteboard.present_frame',
      }),
    ).toBe(true);
  });

  it('should accept message with view', () => {
    expect(
      isValidPresentFrameMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id:example.com',
        content: { view: { isEditMode: false, frameId: 'frame-0' } },
        type: 'net.nordeck.whiteboard.present_frame',
      }),
    ).toBe(true);
  });

  it('should accept additional properties', () => {
    expect(
      isValidPresentFrameMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id:example.com',
        content: {
          view: { isEditMode: false, frameId: 'frame-0', additional: 'tmp' },
          additional: 'tmp',
        },
        type: 'net.nordeck.whiteboard.present_frame',
      }),
    ).toBe(true);
  });

  it.each<object>([
    { view: null },
    { view: 111 },
    { view: {} },
    { view: { isEditMode: false, frameId: undefined } },
    { view: { isEditMode: false, frameId: null } },
    { view: { isEditMode: false, frameId: 111 } },
    { view: { isEditMode: false, frameId: '' } },
    { view: { isEditMode: undefined, frameId: 'frame-0' } },
    { view: { isEditMode: null, frameId: 'frame-0' } },
    { view: { isEditMode: 111, frameId: 'frame-0' } },
    { view: { isEditMode: '', frameId: 'frame-0' } },
  ])('should reject message with patch %j', (patch: object) => {
    expect(
      isValidPresentFrameMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id:example.com',
        content: {
          presenterUserId: '@presenter-user-id:example.com',
          ...patch,
        },
        type: 'net.nordeck.whiteboard.present_frame',
      }),
    ).toBe(false);
  });
});
