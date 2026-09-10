/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { Base64 } from 'js-base64';

/**
 * Calculates pseudonymous identity as unpadded base64 encoding of the
 * SHA-256 hash of the JSON serialization of an array containing the
 * Matrix user id, device id, member id.
 * @param userId user id
 * @param deviceId device id
 * @param memberId member id
 * @returns pseudonymous identity
 */
export async function matrixRtcParticipantIdentity(
  userId: string,
  deviceId: string,
  memberId: string,
): Promise<string> {
  const jsonString = JSON.stringify([userId, deviceId, memberId]);
  const uint8Array = await sha256Digest(jsonString);
  return Base64.fromUint8Array(uint8Array).replace(/=+$/, '');
}

async function sha256Digest(text: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode(text);
  const buffer = await window.crypto.subtle.digest('SHA-256', data);
  return new Uint8Array(buffer);
}
