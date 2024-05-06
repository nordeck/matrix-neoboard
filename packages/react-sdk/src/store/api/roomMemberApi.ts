/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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
  STATE_EVENT_ROOM_MEMBER,
  StateEvent,
  isValidRoomMemberStateEvent,
} from '@matrix-widget-toolkit/api';
import { EntityState, createEntityAdapter } from '@reduxjs/toolkit';
import { isError } from 'lodash';
import { bufferTime, filter } from 'rxjs';
import { ThunkExtraArgument } from '../store';
import { baseApi } from './baseApi';

const roomMemberEventEntityAdapter = createEntityAdapter<
  StateEvent<RoomMemberStateEventContent>
>({
  selectId: (event) => event.state_key,
});

/**
 * Endpoints to access room member events of the current room to show the users
 * display names and avatars.
 *
 * @remarks this api extends the {@link baseApi} so it should
 *          not be registered at the store.
 */
export const roomMemberApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Return the room member events from the current room.
     */
    getRoomMembers: builder.query<
      EntityState<StateEvent<RoomMemberStateEventContent>>,
      void
    >({
      queryFn: async (_, { extra }) => {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          const initialState = roomMemberEventEntityAdapter.getInitialState();

          const events = await widgetApi.receiveStateEvents(
            STATE_EVENT_ROOM_MEMBER,
          );

          return {
            data: roomMemberEventEntityAdapter.addMany(
              initialState,
              events.filter(isValidRoomMemberStateEvent),
            ),
          };
        } catch (e) {
          return {
            error: {
              name: 'LoadFailed',
              message: `Could not load room members: ${
                isError(e) ? e.message : e
              }`,
            },
          };
        }
      },

      async onCacheEntryAdded(
        _,
        { cacheDataLoaded, cacheEntryRemoved, extra, updateCachedData },
      ) {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        // wait until first data is cached
        await cacheDataLoaded;

        const subscription = widgetApi
          .observeStateEvents(STATE_EVENT_ROOM_MEMBER)
          .pipe(
            filter(isValidRoomMemberStateEvent),
            bufferTime(0),
            filter((list) => list.length > 0),
          )
          .subscribe(async (events) => {
            updateCachedData((state) =>
              roomMemberEventEntityAdapter.upsertMany(state, events),
            );
          });

        // wait until subscription is cancelled
        await cacheEntryRemoved;

        subscription.unsubscribe();
      },
    }),
  }),
});

export const { selectAll: selectRoomMembers, selectById: selectRoomMember } =
  roomMemberEventEntityAdapter.getSelectors();

export const { useGetRoomMembersQuery } = roomMemberApi;
