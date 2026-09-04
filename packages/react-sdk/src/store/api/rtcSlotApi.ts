/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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
  compareOriginServerTS,
  makeEventFromSendStateEventResult,
  StateEvent,
} from '@matrix-widget-toolkit/api';
import { createEntityAdapter, EntityState } from '@reduxjs/toolkit';
import isEqual from 'lodash/isEqual';
import isError from 'lodash/isError';
import last from 'lodash/last';
import { bufferTime, filter } from 'rxjs';
import {
  isValidWhiteboardRtcSlotEvent,
  RtcSlot,
  STATE_EVENT_4143_RTC_SLOT,
} from '../../model';
import { ThunkExtraArgument } from '../store';
import { baseApi } from './baseApi';

const rtcSlotsEntityAdapter = createEntityAdapter<StateEvent<RtcSlot>, string>({
  selectId: (event: StateEvent<RtcSlot>) => event.state_key,
  sortComparer: compareOriginServerTS,
});

/**
 * Endpoints to receive specific whiteboard rtc slot.
 *
 * @remarks This api extends the {@link baseApi} and should
 *          not be registered at the store.
 */
export const rtcSlotApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Receive the list of all whiteboard rtc slots in the current room */
    getRtcSlots: builder.query<EntityState<StateEvent<RtcSlot>, string>, void>({
      // do the initial loading
      async queryFn(_, { extra }) {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          const initialState = rtcSlotsEntityAdapter.getInitialState();
          const events = await widgetApi.receiveStateEvents(
            STATE_EVENT_4143_RTC_SLOT,
          );

          return {
            data: rtcSlotsEntityAdapter.addMany(
              initialState,
              events.filter(isValidWhiteboardRtcSlotEvent),
            ),
          };
        } catch (e) {
          return {
            error: {
              name: 'LoadFailed',
              message: `Could not load whiteboard rtc slots: ${
                isError(e) ? e.message : JSON.stringify(e)
              }`,
            },
          };
        }
      },

      // observe the room and apply updates to the redux store.
      // see also https://redux-toolkit.js.org/rtk-query/usage/streaming-updates#using-the-oncacheentryadded-lifecycle
      async onCacheEntryAdded(
        _,
        { cacheDataLoaded, cacheEntryRemoved, extra, updateCachedData },
      ) {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        // wait until first data is cached
        await cacheDataLoaded;

        const subscription = widgetApi
          .observeStateEvents(STATE_EVENT_4143_RTC_SLOT)
          .pipe(
            bufferTime(0),
            filter((list) => list.length > 0),
          )
          .subscribe((events) => {
            // update the cached data if the event changes in the room
            const eventsToUpdate = events.filter(isValidWhiteboardRtcSlotEvent);
            const eventIdsToDelete = events
              .filter(
                (e) =>
                  e.type === STATE_EVENT_4143_RTC_SLOT &&
                  isEqual(e.content, {}),
              )
              .map((e) => e.state_key);

            updateCachedData((state) => {
              rtcSlotsEntityAdapter.upsertMany(state, eventsToUpdate);
              rtcSlotsEntityAdapter.removeMany(state, eventIdsToDelete);
            });
          });

        // wait until subscription is cancelled
        await cacheEntryRemoved;

        subscription.unsubscribe();
      },
    }),

    /**
     * Update the whiteboard event in the current room.
     */
    updateRtcSlot: builder.mutation<
      { event: StateEvent<RtcSlot> },
      { slotId: string; content: RtcSlot }
    >({
      async queryFn({ slotId, content }, { extra }) {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          const rtcSlotEvents = await widgetApi.receiveStateEvents(
            STATE_EVENT_4143_RTC_SLOT,
            { stateKey: slotId },
          );
          const rtcSlotEvent = last(
            rtcSlotEvents.filter(isValidWhiteboardRtcSlotEvent),
          );

          // No recursive merge!
          const rtcSlot = {
            ...(rtcSlotEvent?.content ?? {}),
            ...content,
          };

          if (rtcSlotEvent && isEqual(rtcSlotEvent.content, rtcSlot)) {
            // No change necessary
            return { data: { event: rtcSlotEvent } };
          }

          const result = await widgetApi.sendStateEvent(
            STATE_EVENT_4143_RTC_SLOT,
            rtcSlot,
            { stateKey: slotId },
          );

          if (widgetApi.widgetParameters.userId === undefined) {
            throw new Error('Own user ID is undefined');
          }

          return {
            data: {
              event: makeEventFromSendStateEventResult(
                STATE_EVENT_4143_RTC_SLOT,
                slotId,
                rtcSlot,
                widgetApi.widgetParameters.userId,
                result,
              ),
            },
          };
        } catch (e) {
          return {
            error: {
              name: 'UpdateFailed',
              message: `Could not update whiteboard rtc slot: ${
                isError(e) ? e.message : e
              }`,
            },
          };
        }
      },
    }),
  }),
});

// consume the store using the hooks generated by RTK Query
export const { useGetRtcSlotsQuery, useUpdateRtcSlotMutation } = rtcSlotApi;

export const { selectAll: selectAllRtcSlots, selectById: selectRtcSlotById } =
  rtcSlotsEntityAdapter.getSelectors();
