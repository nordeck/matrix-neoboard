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

import { StateEvent } from '@matrix-widget-toolkit/api';
import Joi from 'joi';
import { isValidEvent } from './validation';

export const STATE_EVENT_ROOM_HISTORY_VISIBILITY = 'm.room.history_visibility';

export type RoomHistoryVisibilityEvent = {
  history_visibility: string;
};

// based on https://github.com/matrix-org/matrix-spec/blob/03cdea4b57320926a6da73ad3b3f6c7f4fd0a7c2/data/event-schemas/schema/m.room.history_visibility.yaml
const roomHistoryVisibilityEventSchema = Joi.object<
  RoomHistoryVisibilityEvent,
  true
>({
  history_visibility: Joi.string()
    .required()
    .valid('invited', 'joined', 'shared', 'world_readable'),
}).unknown();

export function isValidRoomHistoryVisibilityEvent(
  event: StateEvent<unknown>,
): event is StateEvent<RoomHistoryVisibilityEvent> {
  return isValidEvent(
    event,
    STATE_EVENT_ROOM_HISTORY_VISIBILITY,
    roomHistoryVisibilityEventSchema,
  );
}
