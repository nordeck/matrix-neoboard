/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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
import {
  isValidWhiteboardStateEvent,
  STATE_EVENT_WHITEBOARD,
} from './whiteboard';

describe('isValidWhiteboardStateEvent', () => {
  it('should accept event', () => {
    expect(
      isValidWhiteboardStateEvent({
        content: {
          documentId: 'documentId',
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id:example.com',
        state_key: '',
        sender: '@user-id:example.com',
        type: STATE_EVENT_WHITEBOARD,
      }),
    ).toBe(true);
  });

  it('should accept additional properties', () => {
    expect(
      isValidWhiteboardStateEvent({
        content: {
          documentId: 'documentId',
          additional: 'tmp',
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id:example.com',
        state_key: '',
        sender: '@user-id:example.com',
        type: STATE_EVENT_WHITEBOARD,
      }),
    ).toBe(true);
  });

  it.each<object>([
    { documentId: undefined },
    { documentId: null },
    { documentId: '' },
    { documentId: 111 },
  ])('should reject event with patch %j', (patch: object) => {
    expect(
      isValidWhiteboardStateEvent({
        content: {
          documentId: 'documentId',
          ...patch,
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id:example.com',
        state_key: '',
        sender: '@user-id:example.com',
        type: STATE_EVENT_WHITEBOARD,
      }),
    ).toBe(false);
  });
});
