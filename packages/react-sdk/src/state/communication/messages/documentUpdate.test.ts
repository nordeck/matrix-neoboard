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

import { isValidDocumentUpdateMessage } from './documentUpdate';

describe('isValidDocumentUpdateMessage', () => {
  it('should accept message', () => {
    expect(
      isValidDocumentUpdateMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id',
        content: {
          documentId: 'document-id',
          data: 'base64',
        },
        type: 'net.nordeck.whiteboard.document_update',
      }),
    ).toBe(true);
  });

  it('should accept additional properties', () => {
    expect(
      isValidDocumentUpdateMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id',
        content: {
          documentId: 'document-id',
          data: 'base64',
          additional: 'tmp',
        },
        type: 'net.nordeck.whiteboard.document_update',
      }),
    ).toBe(true);
  });

  it.each<Object>([
    { documentId: undefined },
    { documentId: null },
    { documentId: 111 },
    { documentId: '' },
    { data: undefined },
    { data: null },
    { data: 111 },
    { data: '' },
  ])('should reject message with patch %j', (patch: Object) => {
    expect(
      isValidDocumentUpdateMessage({
        senderSessionId: 'sender-session-id',
        senderUserId: '@sender-user-id',
        content: {
          documentId: 'document-id',
          data: 'base64',
          ...patch,
        },
        type: 'net.nordeck.whiteboard.document_update',
      }),
    ).toBe(false);
  });
});
