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

import { getEnvironment } from '@matrix-widget-toolkit/mui';

export function isMatrixRtcMode(): boolean {
  return getEnvironment('REACT_APP_RTC') === 'matrixrtc';
}

export function normalizeMatrixUserId(userId: string): string {
  if (isMatrixRtcMode()) {
    // in MatrixRTC mode, the userId has an additional livekit session component
    // so we remove it (ie. @user:domain:sessionId -> @user:domain)
    userId = userId.split(':', 2).join(':');
  }
  return userId;
}
