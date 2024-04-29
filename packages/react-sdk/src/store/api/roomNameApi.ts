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

import { StateEvent } from '@matrix-widget-toolkit/api';
import { first, isError } from 'lodash';
import { filter } from 'rxjs';
import {
  RoomNameEvent,
  STATE_EVENT_ROOM_NAME,
  isValidRoomNameEvent,
} from '../../model';
import { ThunkExtraArgument } from '../store';
import { baseApi } from './baseApi';

/**
 * Endpoints to read the current room name.
 *
 * @remarks this api extends the {@link baseApi} so it should
 *          not be registered at the store.
 */
export const roomNameApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Return the room name event of a room.
     */
    getRoomName: builder.query<
      { event: StateEvent<RoomNameEvent> | undefined },
      void
    >({
      queryFn: async (_, { extra }) => {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          const events = await widgetApi.receiveStateEvents(
            STATE_EVENT_ROOM_NAME,
          );

          return {
            data: { event: first(events.filter(isValidRoomNameEvent)) },
          };
        } catch (e) {
          return {
            error: {
              name: 'LoadFailed',
              message: `Could not load room name: ${
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
          .observeStateEvents(STATE_EVENT_ROOM_NAME)
          .pipe(filter(isValidRoomNameEvent))
          .subscribe((event) => {
            updateCachedData(() => ({ event }));
          });

        // wait until subscription is cancelled
        await cacheEntryRemoved;

        subscription.unsubscribe();
      },
    }),
  }),
});

export const { useGetRoomNameQuery } = roomNameApi;
