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

import { compareOriginServerTS, StateEvent } from '@matrix-widget-toolkit/api';
import { createEntityAdapter, EntityState } from '@reduxjs/toolkit';
import { isEqual, isError, last } from 'lodash';
import { bufferTime, filter } from 'rxjs';
import {
  isValidWhiteboardStateEvent,
  STATE_EVENT_WHITEBOARD,
  Whiteboard,
} from '../../model';
import { ThunkExtraArgument } from '../store';
import { baseApi } from './baseApi';

const whiteboardsEntityAdapter = createEntityAdapter<StateEvent<Whiteboard>>({
  selectId: (event) => event.state_key,
  sortComparer: compareOriginServerTS,
});

/**
 * Endpoints to receive specific whiteboard.
 *
 * @remarks This api extends the {@link baseApi} and should
 *          not be registered at the store.
 */
export const whiteboardApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Receive the list of all whiteboards in the current room */
    getWhiteboards: builder.query<EntityState<StateEvent<Whiteboard>>, void>({
      // do the initial loading
      async queryFn(_, { extra }) {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          const initialState = whiteboardsEntityAdapter.getInitialState();
          const events = await widgetApi.receiveStateEvents(
            STATE_EVENT_WHITEBOARD,
          );

          return {
            data: whiteboardsEntityAdapter.addMany(
              initialState,
              events.filter(isValidWhiteboardStateEvent),
            ),
          };
        } catch (e) {
          return {
            error: {
              name: 'LoadFailed',
              message: `Could not load whiteboards: ${
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
          .observeStateEvents(STATE_EVENT_WHITEBOARD)
          .pipe(
            bufferTime(0),
            filter((list) => list.length > 0),
          )
          .subscribe((events) => {
            // update the cached data if the event changes in the room
            const eventsToUpdate = events.filter(isValidWhiteboardStateEvent);
            const eventIdsToDelete = events
              .filter(
                (e) =>
                  e.type === STATE_EVENT_WHITEBOARD && isEqual(e.content, {}),
              )
              .map((e) => e.state_key);

            updateCachedData((state) => {
              whiteboardsEntityAdapter.upsertMany(state, eventsToUpdate);
              whiteboardsEntityAdapter.removeMany(state, eventIdsToDelete);
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
    updateWhiteboard: builder.mutation<
      { event: StateEvent<Whiteboard> },
      { whiteboardId: string; content: Whiteboard }
    >({
      async queryFn({ whiteboardId, content }, { extra }) {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          const whiteboardEvents = await widgetApi.receiveStateEvents(
            STATE_EVENT_WHITEBOARD,
            { stateKey: whiteboardId },
          );
          const whiteboardEvent = last(
            whiteboardEvents.filter(isValidWhiteboardStateEvent),
          );

          // No recursive merge!
          const whiteboard = {
            ...(whiteboardEvent?.content ?? {}),
            ...content,
          };

          if (whiteboardEvent && isEqual(whiteboardEvent.content, whiteboard)) {
            // No change necessary
            return { data: { event: whiteboardEvent } };
          }

          const event = await widgetApi.sendStateEvent(
            STATE_EVENT_WHITEBOARD,
            whiteboard,
            { stateKey: whiteboardId },
          );

          return { data: { event } };
        } catch (e) {
          return {
            error: {
              name: 'UpdateFailed',
              message: `Could not update whiteboard: ${
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
export const { useGetWhiteboardsQuery, useUpdateWhiteboardMutation } =
  whiteboardApi;

export const {
  selectAll: selectAllWhiteboards,
  selectById: selectWhiteboardById,
} = whiteboardsEntityAdapter.getSelectors();
