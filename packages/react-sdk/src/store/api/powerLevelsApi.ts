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
  PowerLevelsStateEvent,
  STATE_EVENT_POWER_LEVELS,
  StateEvent,
  isValidPowerLevelStateEvent,
} from '@matrix-widget-toolkit/api';
import { isEqual, isError, last, merge } from 'lodash';
import { bufferTime, filter } from 'rxjs';
import { ThunkExtraArgument } from '../store';
import { baseApi } from './baseApi';

/**
 * Endpoints to access power levels events of the current room to evaluate user
 * powers.
 *
 * @remarks this api extends the {@link baseApi} so it should
 *          not be registered at the store.
 */
export const powerLevelsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Return the power levels events of the current room
     */
    getPowerLevels: builder.query<
      { event: StateEvent<PowerLevelsStateEvent> | undefined },
      void
    >({
      queryFn: async (_, { extra }) => {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          const events = await widgetApi.receiveStateEvents(
            STATE_EVENT_POWER_LEVELS,
            { stateKey: '' },
          );

          return {
            data: { event: last(events.filter(isValidPowerLevelStateEvent)) },
          };
        } catch (e) {
          return {
            error: {
              name: 'LoadFailed',
              message: `Could not load power levels: ${
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
          .observeStateEvents(STATE_EVENT_POWER_LEVELS, {
            stateKey: '',
          })
          .pipe(
            filter(isValidPowerLevelStateEvent),
            bufferTime(0),
            filter((list) => list.length > 0),
          )
          .subscribe(async (events) => {
            updateCachedData((state) => {
              state.event = last(events);
            });
          });

        // wait until subscription is cancelled
        await cacheEntryRemoved;

        subscription.unsubscribe();
      },
    }),

    patchPowerLevels: builder.mutation<
      null,
      { changes: Partial<PowerLevelsStateEvent> }
    >({
      async queryFn({ changes }, { extra }) {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          const powerLevelsEvents = await widgetApi.receiveStateEvents(
            STATE_EVENT_POWER_LEVELS,
            { stateKey: '' },
          );
          const powerLevelEvent = last(
            powerLevelsEvents.filter(isValidPowerLevelStateEvent),
          );
          const powerLevels = merge(
            {},
            powerLevelEvent?.content ?? {},
            changes,
          );

          if (
            powerLevelEvent &&
            isEqual(powerLevelEvent.content, powerLevels)
          ) {
            return { data: null };
          }

          await widgetApi.sendStateEvent(STATE_EVENT_POWER_LEVELS, powerLevels);

          return { data: null };
        } catch (e) {
          return {
            error: {
              name: 'UpdateFailed',
              message: `Could not update power levels for topic submission: ${
                isError(e) ? e.message : e
              }`,
            },
          };
        }
      },
    }),
  }),
});

export const { useGetPowerLevelsQuery, usePatchPowerLevelsMutation } =
  powerLevelsApi;
