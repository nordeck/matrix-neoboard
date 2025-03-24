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

import { StateEvent } from '@matrix-widget-toolkit/api';
import { createEntityAdapter, EntityState } from '@reduxjs/toolkit';
import { isError } from 'lodash';
import { bufferTime, filter } from 'rxjs';
import {
  isValidRTCSessionStateEvent,
  RTCSessionEventContent,
  STATE_EVENT_RTC_MEMBER,
} from '../../model';
import { ThunkExtraArgument } from '../store';
import { baseApi } from './baseApi';

const rtcMembershipEventEntityAdapter = createEntityAdapter({
  selectId: (event: StateEvent<RTCSessionEventContent>) => event.state_key,
});

/**
 * Endpoints to access RTC member events in the current room.
 *
 * @remarks this api extends the {@link baseApi} so it should
 *          not be registered at the store.
 */
export const rtcMemberApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Return the RTC member events from the current room.
     */
    getRtcMembers: builder.query<
      EntityState<StateEvent<RTCSessionEventContent>, string>,
      void
    >({
      queryFn: async (_, { extra }) => {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          const initialState =
            rtcMembershipEventEntityAdapter.getInitialState();

          const events = await widgetApi.receiveStateEvents(
            STATE_EVENT_RTC_MEMBER,
          );

          // @todo filter by application id
          return {
            data: rtcMembershipEventEntityAdapter.addMany(
              initialState,
              events.filter(isValidRTCSessionStateEvent),
            ),
          };
        } catch (e) {
          return {
            error: {
              name: 'LoadFailed',
              message: `Could not load RTC members: ${
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
          .observeStateEvents(STATE_EVENT_RTC_MEMBER)
          .pipe(
            filter(isValidRTCSessionStateEvent),
            bufferTime(0),
            filter((list) => list.length > 0),
          )
          .subscribe(async (events) => {
            updateCachedData((state) =>
              rtcMembershipEventEntityAdapter.upsertMany(state, events),
            );
          });

        // wait until subscription is cancelled
        await cacheEntryRemoved;

        subscription.unsubscribe();
      },
    }),
  }),
});

export const { selectAll: selectRtcMembers, selectById: selectRtcMember } =
  rtcMembershipEventEntityAdapter.getSelectors();

export const { useGetRtcMembersQuery } = rtcMemberApi;
