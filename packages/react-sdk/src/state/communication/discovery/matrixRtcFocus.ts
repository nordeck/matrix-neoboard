/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

export type RTCFocus = {
  type: string;
  [key: string]: unknown;
};

export interface LivekitFocusConfig extends RTCFocus {
  type: 'livekit';
  livekit_service_url: string;
}

export interface LivekitFocus extends LivekitFocusConfig {
  livekit_alias: string;
}

export interface LivekitFocusActive extends RTCFocus {
  type: 'livekit';
  focus_selection: 'oldest_membership';
}
