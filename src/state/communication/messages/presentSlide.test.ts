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

import { isValidPresentSlideMessage } from './presentSlide';

describe('isValidPresentSlideMessage', () => {
  it('should accept message', () => {
    expect(
      isValidPresentSlideMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id',
        content: {},
        type: 'net.nordeck.whiteboard.present_slide',
      })
    ).toBe(true);
  });

  it('should accept message with view', () => {
    expect(
      isValidPresentSlideMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id',
        content: { view: { slideId: 'slide-0' } },
        type: 'net.nordeck.whiteboard.present_slide',
      })
    ).toBe(true);
  });

  it('should accept additional properties', () => {
    expect(
      isValidPresentSlideMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id',
        content: {
          view: { slideId: 'slide-0', additional: 'tmp' },
          additional: 'tmp',
        },
        type: 'net.nordeck.whiteboard.present_slide',
      })
    ).toBe(true);
  });

  it.each<Object>([
    { view: null },
    { view: 111 },
    { view: {} },
    { view: { slideId: undefined } },
    { view: { slideId: null } },
    { view: { slideId: 111 } },
    { view: { slideId: '' } },
  ])('should reject message with patch %j', (patch: Object) => {
    expect(
      isValidPresentSlideMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id',
        content: {
          presenterUserId: '@presenter-user-id',
          ...patch,
        },
        type: 'net.nordeck.whiteboard.present_slide',
      })
    ).toBe(false);
  });
});
