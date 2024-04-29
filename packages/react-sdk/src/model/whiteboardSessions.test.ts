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

import {
  isNotExpired,
  isValidWhiteboardSessionsStateEvent,
} from './whiteboardSessions';

describe('isValidWhiteboardSessionsStateEvent', () => {
  it('should accept event', () => {
    expect(
      isValidWhiteboardSessionsStateEvent({
        content: {
          sessions: [
            {
              whiteboardId: 'whiteboard-id',
              sessionId: 'session-id',
              expiresTs: 100000000,
            },
            {
              whiteboardId: 'whiteboard-id',
              sessionId: 'session-id',
              expiresTs: 100000000,
            },
          ],
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        state_key: '',
        sender: '@user-id',
        type: 'net.nordeck.whiteboard.sessions',
      }),
    ).toBe(true);
  });

  it('should accept additional properties', () => {
    expect(
      isValidWhiteboardSessionsStateEvent({
        content: {
          sessions: [
            {
              whiteboardId: 'whiteboard-id',
              sessionId: 'session-id',
              expiresTs: 100000000,
              additional: 'tmp',
            },
          ],
          additional: 'tmp',
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        state_key: '',
        sender: '@user-id',
        type: 'net.nordeck.whiteboard.sessions',
      }),
    ).toBe(true);
  });

  it('should accept empty sessions', () => {
    expect(
      isValidWhiteboardSessionsStateEvent({
        content: {
          sessions: [],
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        state_key: '',
        sender: '@user-id',
        type: 'net.nordeck.whiteboard.sessions',
      }),
    ).toBe(true);
  });

  it.each<Object>([
    { sessions: undefined },
    { sessions: null },
    { sessions: 111 },
    { sessions: [111] },
    {
      sessions: [
        {
          whiteboardId: undefined,
          sessionId: 'session-id',
          expiresTs: 100000000,
        },
      ],
    },
    {
      sessions: [
        {
          whiteboardId: null,
          sessionId: 'session-id',
          expiresTs: 100000000,
        },
      ],
    },
    {
      sessions: [
        {
          whiteboardId: '',
          sessionId: 'session-id',
          expiresTs: 100000000,
        },
      ],
    },
    {
      sessions: [
        {
          whiteboardId: 111,
          sessionId: 'session-id',
          expiresTs: 100000000,
        },
      ],
    },
    {
      sessions: [
        {
          whiteboardId: 'whiteboard-id',
          sessionId: undefined,
          expiresTs: 100000000,
        },
      ],
    },
    {
      sessions: [
        {
          whiteboardId: 'whiteboard-id',
          sessionId: null,
          expiresTs: 100000000,
        },
      ],
    },
    {
      sessions: [
        {
          whiteboardId: 'whiteboard-id',
          sessionId: '',
          expiresTs: 100000000,
        },
      ],
    },
    {
      sessions: [
        {
          whiteboardId: 'whiteboard-id',
          sessionId: 111,
          expiresTs: 100000000,
        },
      ],
    },
    {
      sessions: [
        {
          whiteboardId: 'whiteboard-id',
          sessionId: 'session-id',
          expiresTs: undefined,
        },
      ],
    },
    {
      sessions: [
        {
          whiteboardId: 'whiteboard-id',
          sessionId: 'session-id',
          expiresTs: null,
        },
      ],
    },
    {
      sessions: [
        {
          whiteboardId: 'whiteboard-id',
          sessionId: 'session-id',
          expiresTs: '100000000',
        },
      ],
    },
  ])('should reject event with patch %j', (patch: Object) => {
    expect(
      isValidWhiteboardSessionsStateEvent({
        content: {
          sessions: [
            {
              whiteboardId: 'whiteboard-id',
              sessionId: 'session-id',
              expiresTs: 100000000,
            },
          ],
          ...patch,
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        state_key: '',
        sender: '@user-id',
        type: 'net.nordeck.whiteboard.sessions',
      }),
    ).toBe(false);
  });
});

describe('isNotExpired', () => {
  it('should be true for unexpired sessions', () => {
    expect(
      isNotExpired({
        sessionId: 'session-id',
        whiteboardId: 'whiteboard-id',
        expiresTs: +new Date('2050-01-12T11:25:20.143Z'),
      }),
    ).toBe(true);
  });

  it('should be false for expired sessions', () => {
    expect(
      isNotExpired({
        sessionId: 'session-id',
        whiteboardId: 'whiteboard-id',
        expiresTs: +new Date('2020-01-12T11:25:20.143Z'),
      }),
    ).toBe(false);
  });
});
