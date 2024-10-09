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

import { RoomEvent } from '@matrix-widget-toolkit/api';
import Joi from 'joi';
import { beforeEach, describe, expect, it } from 'vitest';
import { isValidEvent } from './validation';

const exampleSchema = Joi.object({
  key: Joi.string(),
});

describe('isValidEvent', () => {
  let event: RoomEvent;

  beforeEach(() => {
    event = {
      content: {
        key: 'test',
      },
      event_id: '$event-id',
      origin_server_ts: 1000,
      room_id: '!room-id',
      sender: '@user-id',
      type: 'com.example.event',
    };
  });

  it('should validate event type', () => {
    event.type = 'com.example.other';

    expect(isValidEvent(event, 'com.example.event', exampleSchema)).toEqual(
      false,
    );
  });

  it('should skip events without content', () => {
    event.content = undefined;

    expect(isValidEvent(event, 'com.example.event', exampleSchema)).toEqual(
      false,
    );
  });

  it('should skip events with empty content', () => {
    event.content = {};

    expect(isValidEvent(event, 'com.example.event', exampleSchema)).toEqual(
      false,
    );
  });

  it('should validate event content', () => {
    event.content = { other: 'my-value' };

    expect(isValidEvent(event, 'com.example.event', exampleSchema)).toEqual(
      false,
    );
  });

  it('should validate successful', () => {
    expect(isValidEvent(event, 'com.example.event', exampleSchema)).toEqual(
      true,
    );
  });
});
