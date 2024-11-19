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
import { RoomEncryptionEvent, RoomHistoryVisibilityEvent } from '../model';
import { useActiveWhiteboardInstance } from '../state';
import {
  useGetRoomEncryptionQuery,
  useGetRoomHistoryVisibilityQuery,
  useGetRoomMembersQuery,
} from '../store/api';

type PersistOnJoinOrInviteResult = {
  limitedHistoryVisibility: boolean;
  delayedPersist: boolean;
  lastMembershipEventTs?: number;
};

export function usePersistOnJoinOrInvite(): PersistOnJoinOrInviteResult {
  const whiteboardInstance = useActiveWhiteboardInstance();
  const { data: roomMembers } = useGetRoomMembersQuery();
  const { data: roomEncryption } = useGetRoomEncryptionQuery();
  const { data: roomHistoryVisibility } = useGetRoomHistoryVisibilityQuery();
  const widgetApi = useWidgetApi();
  const ownUserId = widgetApi.widgetParameters.userId;

  if (whiteboardInstance.isLoading()) {
    return {
      limitedHistoryVisibility: false,
      delayedPersist: false,
    };
  }

  const isRoomEncrypted = checkIfRoomEncrypted(roomEncryption);
  const roomHistoryVisibilityValue = getRoomHistoryVisibilityValue(
    roomHistoryVisibility,
  );
  const limitedHistoryVisibility = roomHasLimitedHistoryVisibility(
    isRoomEncrypted,
    roomHistoryVisibilityValue,
  );

  let delayedPersist = true;
  let lastMembershipEventTs: number | undefined = undefined;

  if (limitedHistoryVisibility) {
    const membershipFilter = getMembershipFilter(roomHistoryVisibilityValue);
    const members = roomMembers?.entities;

    if (members) {
      const invitesOrJoins = Object.values(members).filter(membershipFilter);
      const sortedInvitesOrJoins = invitesOrJoins.sort((a, b) => {
        return b.origin_server_ts - a.origin_server_ts;
      });
      const lastInviteOrJoin = sortedInvitesOrJoins[0];

      if (shouldUseInvite(lastInviteOrJoin, roomHistoryVisibilityValue)) {
        // TODO: Implement logic to get the timestamp of the invite event.
        // There is currently no way to get an event by id or
        // fetch an older state event from the room timeline using the Widget API
        // lastInviteOrJoin = getInviteEvent(lastInviteOrJoin);
      }

      delayedPersist = !shouldPersistImmediately(lastInviteOrJoin, ownUserId);
      lastMembershipEventTs = lastInviteOrJoin.origin_server_ts;
    }
  }

  return {
    limitedHistoryVisibility,
    delayedPersist,
    lastMembershipEventTs,
  };
}

export function cancelableSnapshotTimer(
  callback: () => void,
  delay: number,
): { cancel: () => void } {
  let timerId: NodeJS.Timeout | null = setTimeout(callback, delay);

  return {
    cancel: () => {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
    },
  };
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

function roomHasLimitedHistoryVisibility(
  isRoomEncrypted: boolean,
  roomHistoryVisibilityValue: string | undefined,
): boolean {
  return (
    isRoomEncrypted ||
    (roomHistoryVisibilityValue !== undefined &&
      roomHistoryVisibilityValue !== 'shared')
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

function shouldUseInvite(
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
