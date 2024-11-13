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
import { useWidgetApi } from '@matrix-widget-toolkit/react';
import { PropsWithChildren, useEffect } from 'react';
import { RoomEncryptionEvent, RoomHistoryVisibilityEvent } from '../../model';
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
  const ownUserId = useWidgetApi().widgetParameters.userId;

  useEffect(() => {
    const isRoomEncrypted = checkIfRoomEncrypted(roomEncryption);
    const roomHistoryVisibilityValue = getRoomHistoryVisibilityValue(
      roomHistoryVisibility,
    );
    const isRoomHistoryVisibilityShared = checkIfRoomHistoryVisibilityShared(
      roomHistoryVisibilityValue,
    );
    const sendFallbackSnapshot = shouldSendFallbackSnapshot(
      isRoomEncrypted,
      isRoomHistoryVisibilityShared,
      roomHistoryVisibilityValue,
    );

    if (sendFallbackSnapshot) {
      const membershipFilter = getMembershipFilter(roomHistoryVisibilityValue);
      const members = roomMembers?.entities;

      if (members) {
        const invitesOrJoins = Object.values(members).filter(membershipFilter);
        const sortedInvitesOrJoins = invitesOrJoins.sort((a, b) => {
          return b.origin_server_ts - a.origin_server_ts;
        });
        const lastInviteOrJoin = sortedInvitesOrJoins[0];

        if (
          shouldUseInviteTimestamp(lastInviteOrJoin, roomHistoryVisibilityValue)
        ) {
          // TODO: Implement logic to get the timestamp of the invite event.
          // There is currently no way to get an event by id or
          // fetch an older state event from the room timeline using the Widget API
        }

        const immediate = shouldPersistImmediately(lastInviteOrJoin, ownUserId);

        whiteboardInstance.persist({
          timestamp: lastInviteOrJoin.origin_server_ts,
          immediate,
        });
      }
    }
  }, [
    roomMembers,
    whiteboardInstance,
    roomEncryption,
    roomHistoryVisibility,
    ownUserId,
  ]);

  return <>{children}</>;
}

function checkIfRoomEncrypted(roomEncryption?: {
  event: StateEvent<RoomEncryptionEvent> | undefined;
}): boolean {
  return (
    (roomEncryption && roomEncryption.event?.content?.algorithm) !== undefined
  );
}

function getRoomHistoryVisibilityValue(roomHistoryVisibility?: {
  event: StateEvent<RoomHistoryVisibilityEvent> | undefined;
}): string | undefined {
  return roomHistoryVisibility?.event?.content?.history_visibility;
}

function checkIfRoomHistoryVisibilityShared(
  roomHistoryVisibilityValue: string | undefined,
): boolean {
  return roomHistoryVisibilityValue === 'shared';
}

function shouldSendFallbackSnapshot(
  isRoomEncrypted: boolean,
  isRoomHistoryVisibilityShared: boolean,
  roomHistoryVisibilityValue: string | undefined,
): boolean {
  return (
    isRoomEncrypted ||
    (!isRoomHistoryVisibilityShared && roomHistoryVisibilityValue !== undefined)
  );
}

function getMembershipFilter(
  roomHistoryVisibilityValue: string | undefined,
): (member: StateEvent<RoomMemberStateEventContent>) => boolean {
  if (roomHistoryVisibilityValue === 'joined') {
    return (member) => member.content.membership === 'join';
  }
  return (member) =>
    member.content.membership === 'invite' ||
    member.content.membership === 'join';
}

function shouldUseInviteTimestamp(
  lastInviteOrJoin: StateEvent<RoomMemberStateEventContent>,
  roomHistoryVisibilityValue: string | undefined,
) {
  if (
    lastInviteOrJoin.content.membership === 'join' &&
    roomHistoryVisibilityValue === 'invited'
  ) {
    const joinEventObject = Object(lastInviteOrJoin);
    return joinEventObject['unsigned'].prev_content?.membership === 'invite';
  }
  return false;
}

function shouldPersistImmediately(
  lastInviteOrJoin: StateEvent<RoomMemberStateEventContent>,
  ownUserId: string | undefined,
) {
  return (
    lastInviteOrJoin.sender === ownUserId &&
    lastInviteOrJoin.content.membership === 'invite'
  );
}
