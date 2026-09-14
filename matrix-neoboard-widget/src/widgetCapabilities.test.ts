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

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const userId = '@user-id:example.com';

const moduleLoadTimeout = 120_000;

/** The capabilities that are requested regardless of the RTC implementation. */
const baseCapabilities = [
  'org.matrix.msc2762.send.event:net.nordeck.whiteboard.document.create',
  'org.matrix.msc2762.receive.event:net.nordeck.whiteboard.document.create',
  'org.matrix.msc2762.send.event:net.nordeck.whiteboard.document.snapshot',
  'org.matrix.msc2762.receive.event:net.nordeck.whiteboard.document.snapshot',
  'org.matrix.msc2762.send.event:net.nordeck.whiteboard.document.chunk',
  'org.matrix.msc2762.receive.event:net.nordeck.whiteboard.document.chunk',
  'org.matrix.msc2762.send.state_event:m.room.power_levels#',
  'org.matrix.msc2762.receive.state_event:m.room.power_levels#',
  'org.matrix.msc2762.receive.state_event:m.room.create',
  'org.matrix.msc2762.receive.state_event:m.room.member',
  'org.matrix.msc2762.send.state_event:net.nordeck.whiteboard',
  'org.matrix.msc2762.receive.state_event:net.nordeck.whiteboard',
  'org.matrix.msc2762.receive.state_event:m.room.name',
  'org.matrix.msc3819.send.to_device:net.nordeck.whiteboard.connection_signaling',
  'org.matrix.msc3819.receive.to_device:net.nordeck.whiteboard.connection_signaling',
  'town.robin.msc3846.turn_servers',
  'org.matrix.msc4039.upload_file',
  'org.matrix.msc4039.download_file',
];

const matrixRtcCapabilities = [
  'org.matrix.msc4515.rtc_transports',
  'org.matrix.msc2762.send.state_event:org.matrix.msc4143.rtc.slot',
  'org.matrix.msc2762.receive.state_event:org.matrix.msc4143.rtc.slot',
  'org.matrix.msc2762.send.event:org.matrix.msc4143.rtc.member',
  'org.matrix.msc2762.receive.event:org.matrix.msc4143.rtc.member',
  'org.matrix.msc4407.receive.sticky_event',
  'org.matrix.msc4407.send.sticky_event',
  'org.matrix.msc4157.send.delayed_event',
  'org.matrix.msc4157.update_delayed_event',
];

const webRtcCapabilities = [
  // The own session state is written, but the state of everyone is read
  `org.matrix.msc2762.send.state_event:net.nordeck.whiteboard.sessions#${userId}`,
  'org.matrix.msc2762.receive.state_event:net.nordeck.whiteboard.sessions',
];

async function loadCapabilities(
  rtcMode: string | undefined,
): Promise<string[]> {
  vi.stubEnv('REACT_APP_RTC', rtcMode);
  vi.resetModules();

  const { widgetCapabilities } = await import('./widgetCapabilities');

  return widgetCapabilities.map((capability) =>
    typeof capability === 'string' ? capability : capability.raw,
  );
}

let defaultMode: string[];
let matrixRtcMode: string[];
let webRtcMode: string[];

beforeAll(async () => {
  window.location.hash = `#/?matrix_user_id=${encodeURIComponent(userId)}`;

  defaultMode = await loadCapabilities(undefined);
  matrixRtcMode = await loadCapabilities('matrixrtc');
  webRtcMode = await loadCapabilities('webrtc');
}, moduleLoadTimeout);

afterAll(() => {
  vi.unstubAllEnvs();
});

describe('widgetCapabilities', () => {
  it('should request the base capabilities in both modes', () => {
    expect(matrixRtcMode).toEqual(expect.arrayContaining(baseCapabilities));
    expect(webRtcMode).toEqual(expect.arrayContaining(baseCapabilities));
  });

  it('should request the MatrixRTC capabilities in MatrixRTC mode', () => {
    expect(matrixRtcMode).toEqual([
      ...baseCapabilities,
      ...matrixRtcCapabilities,
    ]);
  });

  it('should request the session capabilities in WebRTC mode', () => {
    expect(webRtcMode).toEqual([...baseCapabilities, ...webRtcCapabilities]);
  });

  it('should default to MatrixRTC if the mode is not configured', () => {
    expect(defaultMode).toEqual(matrixRtcMode);
  });
});
