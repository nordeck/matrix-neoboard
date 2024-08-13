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

import {
  STATE_EVENT_DOCUMENT_PREVIEW,
  isValidDocumentPreviewEvent,
} from './documentPreview';

describe('isValidDocumentPreviewEvent', () => {
  it('should accept event', () => {
    expect(
      isValidDocumentPreviewEvent({
        content: {
          preview: 'data:image/png;base64,...',
        },
        event_id: '$event-id',
        origin_server_ts: 0,
        room_id: '!room-id',
        state_key: '',
        sender: '@user-id',
        type: STATE_EVENT_DOCUMENT_PREVIEW,
      }),
    ).toBe(true);
  });
});
