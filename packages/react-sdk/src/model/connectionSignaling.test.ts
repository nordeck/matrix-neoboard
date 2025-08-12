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
import { isValidConnectionSignalingMessage } from './connectionSignaling';

describe('isValidConnectionSignalingMessage', () => {
  it('should accept event', () => {
    expect(
      isValidConnectionSignalingMessage({
        content: {
          sessionId: 'id',
          connectionId: 'id',
          description: {
            sdp: 'string',
            type: 'answer',
          },
          candidates: [
            {
              candidate: 'candidate',
              sdpMLineIndex: 5,
              sdpMid: 'mid',
              usernameFragment: 'fragment',
            },
            {
              candidate: '',
              sdpMLineIndex: 5,
              sdpMid: '',
              usernameFragment: '',
            },
          ],
        },
        sender: '@user-id:example.com',
        encrypted: false,
        type: 'net.nordeck.whiteboard.connection_signaling',
      }),
    ).toBe(true);
  });

  it('should accept additional properties', () => {
    expect(
      isValidConnectionSignalingMessage({
        content: {
          sessionId: 'id',
          connectionId: 'id',
          description: {
            sdp: 'string',
            type: 'answer',
            additional: 'tmp',
          },
          candidates: [
            {
              candidate: 'candidate',
              sdpMLineIndex: 5,
              sdpMid: 'mid',
              usernameFragment: 'fragment',
              additional: 'tmp',
            },
          ],
          additional: 'tmp',
        },
        sender: '@user-id:example.com',
        encrypted: false,
        type: 'net.nordeck.whiteboard.connection_signaling',
      }),
    ).toBe(true);
  });

  it.each<object>([
    { description: undefined },
    { description: { type: 'answer' } },
    { description: { type: 'offer' } },
    { description: { type: 'pranswer' } },
    { description: { type: 'rollback' } },
    { candidates: undefined },
    { candidates: [] },
    { candidates: [null] },
    { candidates: [{ sdpMLineIndex: null }] },
    { candidates: [{ sdpMid: null }] },
    { candidates: [{ usernameFragment: null }] },
  ])('should accept event with patch %j', (patch: object) => {
    expect(
      isValidConnectionSignalingMessage({
        content: {
          sessionId: 'id',
          connectionId: 'id',
          description: {
            sdp: 'string',
            type: 'answer',
          },
          candidates: [
            {
              candidate: 'candidate',
              sdpMLineIndex: 5,
              sdpMid: 'mid',
              usernameFragment: 'fragment',
            },
          ],
          ...patch,
        },
        sender: '@user-id:example.com',
        encrypted: false,
        type: 'net.nordeck.whiteboard.connection_signaling',
      }),
    ).toBe(true);
  });

  it.each<object>([
    { sessionId: undefined },
    { sessionId: null },
    { sessionId: 111 },
    { sessionId: '' },
    { connectionId: undefined },
    { connectionId: null },
    { connectionId: 111 },
    { connectionId: '' },
    { description: null },
    { description: 111 },
    { description: { type: 'other' } },
    { description: { type: 'answer', sdp: null } },
    { description: { type: 'answer', sdp: 111 } },
    { candidates: null },
    { candidates: 111 },
    { candidates: [undefined] },
    { candidates: [111] },
    { candidates: [{ candidate: null }] },
    { candidates: [{ candidate: 111 }] },
    { candidates: [{ sdpMLineIndex: '111' }] },
    { candidates: [{ sdpMid: 111 }] },
    { candidates: [{ usernameFragment: 111 }] },
  ])('should reject event with patch %j', (patch: object) => {
    expect(
      isValidConnectionSignalingMessage({
        content: {
          sessionId: 'id',
          connectionId: 'id',
          description: {
            sdp: 'string',
            type: 'answer',
          },
          candidates: [
            {
              candidate: 'candidate',
              sdpMLineIndex: 5,
              sdpMid: 'mid',
              usernameFragment: 'fragment',
            },
          ],
          ...patch,
        },
        sender: '@user-id:example.com',
        encrypted: false,
        type: 'net.nordeck.whiteboard.connection_signaling',
      }),
    ).toBe(false);
  });
});
