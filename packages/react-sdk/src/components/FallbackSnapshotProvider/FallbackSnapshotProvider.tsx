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

import {
  RoomMemberStateEventContent,
  StateEvent,
} from '@matrix-widget-toolkit/api';
import { PropsWithChildren, useEffect } from 'react';
import { useActiveWhiteboardInstance } from '../../state';
import {
  useGetRoomEncryptionQuery,
  useGetRoomHistoryVisibilityQuery,
  useGetRoomMembersQuery,
} from '../../store/api';

export function FallbackSnapshotProvider({ children }: PropsWithChildren<{}>) {
  const whiteboardInstance = useActiveWhiteboardInstance();
  const { data: roomMembers } = useGetRoomMembersQuery();
  const { data: roomEncryption } = useGetRoomEncryptionQuery();
  const { data: roomHistoryVisibility } = useGetRoomHistoryVisibilityQuery();

  useEffect(() => {
    const isRoomEncrypted =
      (roomEncryption && roomEncryption.event?.content?.algorithm) !==
      undefined;
    const roomHistoryVisibilityValue =
      roomHistoryVisibility &&
      roomHistoryVisibility?.event?.content?.history_visibility;
    const isRoomHistoryVisibilityShared =
      roomHistoryVisibilityValue && roomHistoryVisibilityValue === 'shared';
    const sendFallbackSnapshot =
      isRoomEncrypted ||
      (!isRoomHistoryVisibilityShared &&
        roomHistoryVisibilityValue !== undefined);

    if (sendFallbackSnapshot) {
      let membershipFilter = (
        member: StateEvent<RoomMemberStateEventContent>,
      ) => {
        return (
          member.content.membership == 'invite' ||
          member.content.membership == 'join'
        );
      };
      if (roomHistoryVisibilityValue == 'joined') {
        membershipFilter = (
          member: StateEvent<RoomMemberStateEventContent>,
        ) => {
          return member.content.membership == 'join';
        };
      }

      const members = roomMembers?.entities;
      if (members) {
        const invitesOrJoins = Object.values(members).filter(membershipFilter);
        const sortedInvitesOrJoins = invitesOrJoins.sort((a, b) => {
          return b.origin_server_ts - a.origin_server_ts;
        });
        const lastInviteOrJoin = sortedInvitesOrJoins[0];

        if (
          lastInviteOrJoin.content.membership == 'join' &&
          roomHistoryVisibilityValue == 'invited'
        ) {
          // get the invite instead
          const joinEventObject = Object(lastInviteOrJoin);
          const prevEventWasJoin =
            joinEventObject['unsigned'].prev_content?.membership == 'invite';
          if (prevEventWasJoin) {
            const _ = joinEventObject['unsigned']?.replaces_state;
            // TODO: we now need to get the timestamp of the invite event and use that instead
            // but the Widget API doesn't have a way to get an event by event ID
          }
        }

        whiteboardInstance.persistIfOlderThan(
          lastInviteOrJoin.origin_server_ts,
        );
      }
    }
  }, [roomMembers, whiteboardInstance, roomEncryption, roomHistoryVisibility]);

  return <>{children}</>;
}
