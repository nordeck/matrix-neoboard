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
import { isValidRoomHistoryVisibilityEvent } from './roomHistoryVisibilityEvent';

describe('is valid event', () => {
  it('should accept event', () => {
    expect(
      isValidRoomHistoryVisibilityEvent({
        content: {
          history_visibility: 'shared',
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        state_key: '',
        sender: '@user-id',
        type: 'm.room.history_visibility',
      }),
    ).toBe(true);
  });

  it.each<object>([
    { history_visibility: 'invited' },
    { history_visibility: 'joined' },
    { history_visibility: 'world_readable' },
  ])('should accept event with patch %j', (patch: object) => {
    expect(
      isValidRoomHistoryVisibilityEvent({
        content: {
          history_visibility: 'shared',
          ...patch,
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        state_key: '',
        sender: '@user-id',
        type: 'm.room.history_visibility',
      }),
    ).toBe(true);
  });

  it.each<object>([
    { history_visibility: undefined },
    { history_visibility: null },
  ])('should reject event with patch %j', (patch: object) => {
    expect(
      isValidRoomHistoryVisibilityEvent({
        content: {
          history_visibility: 'shared',
          ...patch,
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        state_key: '',
        sender: '@user-id',
        type: 'm.room.history_visibility',
      }),
    ).toBe(false);
  });
});
