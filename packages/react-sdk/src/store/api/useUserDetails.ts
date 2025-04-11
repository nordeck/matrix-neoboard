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

import { getRoomMemberDisplayName } from '@matrix-widget-toolkit/api';
import { useCallback } from 'react';
import { matrixRtcMode } from '../../components/Whiteboard/constants';
import {
  selectRoomMember,
  selectRoomMembers,
  useGetRoomMembersQuery,
} from './roomMemberApi';

type UseUserDetailsReturn = {
  getUserDisplayName: (userId: string) => string;
  getUserAvatarUrl: (userId: string) => string | undefined;
};

export function useUserDetails(): UseUserDetailsReturn {
  const { data: roomMembers } = useGetRoomMembersQuery();
  const allRoomMembers = roomMembers
    ? selectRoomMembers(roomMembers)
    : undefined;

  const getUserDisplayName = useCallback(
    (userId: string) => {
      if (matrixRtcMode) {
        // in MatrixRTC mode, the userId has an additional livekit session component
        // so we remove it (ie. @user:domain:sessionId -> @user:domain)
        const parts = userId.split(':');
        if (parts.length === 3) {
          userId = parts[0] + ':' + parts[1];
        }
      }
      const memberEvent = roomMembers
        ? selectRoomMember(roomMembers, userId)
        : undefined;
      return memberEvent
        ? getRoomMemberDisplayName(memberEvent, allRoomMembers)
        : userId;
    },
    [allRoomMembers, roomMembers],
  );

  const getUserAvatarUrl = useCallback(
    (userId: string) => {
      const memberEvent = roomMembers
        ? selectRoomMember(roomMembers, userId)
        : undefined;
      return memberEvent?.content.avatar_url ?? undefined;
    },
    [roomMembers],
  );

  return {
    getUserDisplayName,
    getUserAvatarUrl,
  };
}
