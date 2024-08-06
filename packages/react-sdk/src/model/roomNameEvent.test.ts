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

import { isValidRoomNameEvent } from './roomNameEvent';

describe('isValidRoomNameEvent', () => {
  it('should accept event', () => {
    expect(
      isValidRoomNameEvent({
        content: {
          name: 'Room',
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        state_key: '',
        sender: '@user-id',
        type: 'm.room.name',
      }),
    ).toBe(true);
  });

  it('should accept additional properties', () => {
    expect(
      isValidRoomNameEvent({
        content: {
          name: 'Room',
          additional: 'tmp',
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        state_key: '',
        sender: '@user-id',
        type: 'm.room.name',
      }),
    ).toBe(true);
  });

  it.each<object>([{ name: undefined }, { name: null }, { name: 111 }])(
    'should reject event with patch %j',
    (patch: object) => {
      expect(
        isValidRoomNameEvent({
          content: {
            name: 'Room',
            ...patch,
          },
          event_id: '$event-id',
          origin_server_ts: 0,
          room_id: '!room-id',
          state_key: '',
          sender: '@user-id',
          type: 'm.room.name',
        }),
      ).toBe(false);
    },
  );
});
