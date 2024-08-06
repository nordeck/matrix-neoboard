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

import { isValidDocumentSnapshotRoomEvent } from './documentSnapshot';

describe('isValidDocumentSnapshotRoomEvent', () => {
  it('should accept event', () => {
    expect(
      isValidDocumentSnapshotRoomEvent({
        content: {
          chunkCount: 5,
          'm.relates_to': {
            rel_type: 'm.reference',
            event_id: '$event-id',
          },
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        sender: '@user-id',
        type: 'net.nordeck.whiteboard.document.snapshot',
      }),
    ).toBe(true);
  });

  it('should accept additional properties', () => {
    expect(
      isValidDocumentSnapshotRoomEvent({
        content: {
          chunkCount: 5,
          'm.relates_to': {
            rel_type: 'm.reference',
            event_id: '$event-id',
            additional: 'tmp',
          },
          additional: 'tmp',
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        sender: '@user-id',
        type: 'net.nordeck.whiteboard.document.snapshot',
      }),
    ).toBe(true);
  });

  it.each<object>([
    { chunkCount: undefined },
    { chunkCount: null },
    { chunkCount: 1.1 },
    { chunkCount: '1' },
    { chunkCount: {} },
    { 'm.relates_to': undefined },
    { 'm.relates_to': null },
    { 'm.relates_to': 111 },
    { 'm.relates_to': { rel_type: undefined, event_id: '$event-id' } },
    { 'm.relates_to': { rel_type: null, event_id: '$event-id' } },
    { 'm.relates_to': { rel_type: '', event_id: '$event-id' } },
    { 'm.relates_to': { rel_type: 'm.replace', event_id: '$event-id' } },
    { 'm.relates_to': { rel_type: 'm.reference', event_id: undefined } },
    { 'm.relates_to': { rel_type: 'm.reference', event_id: null } },
    { 'm.relates_to': { rel_type: 'm.reference', event_id: '' } },
  ])('should reject event with patch %j', (patch: object) => {
    expect(
      isValidDocumentSnapshotRoomEvent({
        content: {
          chunkCount: 5,
          'm.relates_to': {
            rel_type: 'm.reference',
            event_id: '$event-id',
          },
          ...patch,
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        sender: '@user-id',
        type: 'net.nordeck.whiteboard.document.snapshot',
      }),
    ).toBe(false);
  });
});
