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

import { StateEvent } from '@matrix-widget-toolkit/api';
import { first, isError } from 'lodash';
import { filter } from 'rxjs';
import {
  RoomEncryptionEvent,
  STATE_EVENT_ROOM_ENCRYPTION,
  isValidRoomEncryptionEvent,
} from '../../model';
import { ThunkExtraArgument } from '../store';
import { baseApi } from './baseApi';

/**
 * Endpoints to read the current room encryption state.
 *
 * @remarks this api extends the {@link baseApi} so it should
 *          not be registered at the store.
 */
export const roomEncryptionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Return the room encryption event of a room.
     */
    getRoomEncryption: builder.query<
      { event: StateEvent<RoomEncryptionEvent> | undefined },
      void
    >({
      queryFn: async (_, { extra }) => {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          const events = await widgetApi.receiveStateEvents(
            STATE_EVENT_ROOM_ENCRYPTION,
          );

          return {
            data: { event: first(events.filter(isValidRoomEncryptionEvent)) },
          };
        } catch (e) {
          return {
            error: {
              name: 'LoadFailed',
              message: `Could not load room encryption state: ${
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
          .observeStateEvents(STATE_EVENT_ROOM_ENCRYPTION)
          .pipe(filter(isValidRoomEncryptionEvent))
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

export const { useGetRoomEncryptionQuery } = roomEncryptionApi;
