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

import { StateEvent } from '@matrix-widget-toolkit/api';
import Joi from 'joi';
import { isValidEvent } from './validation';

export const STATE_EVENT_WHITEBOARD_SESSIONS =
  'net.nordeck.whiteboard.sessions';

export type WhiteboardSession = {
  sessionId: string;
  whiteboardId: string;
  expiresTs: number;
};

export type WhiteboardSessions = {
  sessions: WhiteboardSession[];
};

const whiteboardSessionSchema = Joi.object<WhiteboardSession, true>({
  sessionId: Joi.string().required(),
  whiteboardId: Joi.string().required(),
  expiresTs: Joi.number().strict().required(),
}).unknown();

const whiteboardSessionsSchema = Joi.object<WhiteboardSessions, true>({
  sessions: Joi.array().items(whiteboardSessionSchema).required(),
}).unknown();

export function isValidWhiteboardSessionsStateEvent(
  event: StateEvent<unknown>,
): event is StateEvent<WhiteboardSessions> {
  return isValidEvent(
    event,
    STATE_EVENT_WHITEBOARD_SESSIONS,
    whiteboardSessionsSchema,
  );
}

export function isNotExpired(session: WhiteboardSession): boolean {
  return session.expiresTs > Date.now();
}
