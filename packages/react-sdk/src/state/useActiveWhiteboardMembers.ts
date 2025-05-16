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

import { useMemo } from 'react';
import { matrixRtcMode } from '../components/Whiteboard';
import { isPeerConnected } from './communication/connection';
import { useActiveWhiteboardInstanceStatistics } from './useActiveWhiteboardInstance';

export type ActiveWhiteboardMember = {
  userId: string;
};

export function useActiveWhiteboardMembers(): ActiveWhiteboardMember[] {
  const statistics = useActiveWhiteboardInstanceStatistics();

  return useMemo(() => {
    const activeWhiteboardMembers = new Map<string, ActiveWhiteboardMember>();

    if (matrixRtcMode) {
      const allRtcMembers = statistics.communicationChannel.sessions
        ? statistics.communicationChannel.sessions.filter(
            (s) => s.expiresTs > Date.now(),
          )
        : undefined;

      allRtcMembers?.forEach((s) => {
        activeWhiteboardMembers.set(s.userId, {
          userId: s.userId,
        });
      });
    } else {
      Object.values(statistics.communicationChannel.peerConnections).forEach(
        (p) => {
          if (isPeerConnected(p)) {
            activeWhiteboardMembers.set(p.remoteUserId, {
              userId: p.remoteUserId,
            });
          }
        },
      );
    }
    return Array.from(activeWhiteboardMembers.values());
  }, [
    statistics.communicationChannel.sessions,
    statistics.communicationChannel.peerConnections,
  ]);
}
