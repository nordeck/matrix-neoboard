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

import { ToDeviceMessageEvent } from '@matrix-widget-toolkit/api';
import Joi from 'joi';
import { isValidEvent } from './validation';

export const TO_DEVICE_MESSAGE_CONNECTION_SIGNALING =
  'net.nordeck.whiteboard.connection_signaling';

export type Candidate = {
  candidate?: string;
  sdpMLineIndex?: number | null;
  sdpMid?: string | null;
  usernameFragment?: string | null;
} | null;

export type Description = {
  sdp?: string;
  type: 'answer' | 'offer' | 'pranswer' | 'rollback';
};

export type ConnectionSignaling = {
  sessionId: string;
  connectionId: string;
  description?: Description;
  candidates?: Candidate[];
};

const candidateSchema = Joi.object<Candidate, true>({
  candidate: Joi.string().min(0),
  sdpMLineIndex: Joi.number().strict().allow(null),
  sdpMid: Joi.string().min(0).allow(null),
  usernameFragment: Joi.string().min(0).allow(null),
})
  .allow(null)
  .unknown();

const descriptionSchema = Joi.object<Description, true>({
  sdp: Joi.string().min(0),
  type: Joi.string()
    .required()
    .valid('answer', 'offer', 'pranswer', 'rollback'),
}).unknown();

const sessionSignalingSchema = Joi.object<ConnectionSignaling, true>({
  sessionId: Joi.string().required(),
  connectionId: Joi.string().required(),
  description: descriptionSchema,
  candidates: Joi.array().items(candidateSchema),
}).unknown();

export function isValidConnectionSignalingMessage(
  event: ToDeviceMessageEvent<unknown>
): event is ToDeviceMessageEvent<ConnectionSignaling> {
  return isValidEvent(
    event,
    TO_DEVICE_MESSAGE_CONNECTION_SIGNALING,
    sessionSignalingSchema
  );
}
