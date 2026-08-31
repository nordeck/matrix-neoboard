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
  isValidNordeckWhiteboardStateEvent,
  isValidWhiteboardStateEvent,
  STATE_EVENT_4143_RTC_SLOT,
  STATE_EVENT_WHITEBOARD,
} from './whiteboard';

describe('isValidNordeckWhiteboardStateEvent', () => {
  it('should accept event', () => {
    expect(
      isValidNordeckWhiteboardStateEvent({
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
      isValidNordeckWhiteboardStateEvent({
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
      isValidNordeckWhiteboardStateEvent({
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

describe('isValidWhiteboardStateEvent', () => {
  it('should accept event', () => {
    expect(
      isValidWhiteboardStateEvent({
        content: {
          status: 'open',
          application: {
            type: 'net.nordeck.whiteboard',
            documentId: 'documentId',
          },
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id:example.com',
        state_key: '',
        sender: '@user-id:example.com',
        type: STATE_EVENT_4143_RTC_SLOT,
      }),
    ).toBe(true);
  });

  it('should accept additional properties', () => {
    expect(
      isValidWhiteboardStateEvent({
        content: {
          status: 'open',
          application: {
            type: 'net.nordeck.whiteboard',
            documentId: 'documentId',
            additional: 'tmp',
          },
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id:example.com',
        state_key: '',
        sender: '@user-id:example.com',
        type: STATE_EVENT_4143_RTC_SLOT,
      }),
    ).toBe(true);
  });

  it.each<object>([
    { status: undefined },
    { status: 'other' },
    { application: undefined },
    { application: 111 },
  ])('should reject event with content patch %j', (patch: object) => {
    expect(
      isValidWhiteboardStateEvent({
        content: {
          status: 'open',
          application: {
            type: 'net.nordeck.whiteboard',
            documentId: 'documentId',
          },
          ...patch,
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id:example.com',
        state_key: '',
        sender: '@user-id:example.com',
        type: STATE_EVENT_4143_RTC_SLOT,
      }),
    ).toBe(false);
  });

  it.each<object>([
    { type: undefined },
    { type: 'other' },
    { documentId: undefined },
    { documentId: null },
    { documentId: '' },
    { documentId: 111 },
  ])('should reject event with application patch %j', (patch: object) => {
    expect(
      isValidWhiteboardStateEvent({
        content: {
          status: 'open',
          application: {
            type: 'net.nordeck.whiteboard',
            documentId: 'documentId',
            ...patch,
          },
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id:example.com',
        state_key: '',
        sender: '@user-id:example.com',
        type: STATE_EVENT_4143_RTC_SLOT,
      }),
    ).toBe(false);
  });
});
