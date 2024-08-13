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
  DocumentPreviewEvent,
  STATE_EVENT_DOCUMENT_PREVIEW,
  isValidDocumentPreviewEvent,
} from '../../model';
import { ThunkExtraArgument } from '../store';
import { baseApi } from './baseApi';

/**
 * Endpoints to read the document preview event.
 *
 * @remarks this api extends the {@link baseApi} so it should
 *          not be registered at the store.
 */
export const documentPreviewApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /**
     * Return the document preview event of a room.
     */
    getDocumentPreview: builder.query<
      { event: StateEvent<DocumentPreviewEvent> | undefined },
      void
    >({
      queryFn: async (_, { extra }) => {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          const events = await widgetApi.receiveStateEvents(
            STATE_EVENT_DOCUMENT_PREVIEW,
          );

          return {
            data: { event: first(events.filter(isValidDocumentPreviewEvent)) },
          };
        } catch (e) {
          return {
            error: {
              name: 'LoadFailed',
              message: `Could not load document preview: ${
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
          .observeStateEvents(STATE_EVENT_DOCUMENT_PREVIEW)
          .pipe(filter(isValidDocumentPreviewEvent))
          .subscribe((event) => {
            updateCachedData(() => ({ event }));
          });

        // wait until subscription is cancelled
        await cacheEntryRemoved;

        subscription.unsubscribe();
      },
    }),

    /**
     * Create a document snapshot in the current room.
     */
    createDocumentPreview: builder.mutation<
      { event: StateEvent<DocumentPreviewEvent> },
      { documentId: string; data: string }
    >({
      async queryFn({ data }, { extra }) {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          // Based on https://spec.matrix.org/unstable/client-server-api/#size-limits and https://github.com/matrix-org/matrix-js-sdk/blob/7b10fa367df357b51c2e78e220d39e5e7967f9e3/src/crypto/OlmDevice.ts#L27-L29
          // keeping 4kb for headers, trailers, and signatures.
          const maxSize = 34000;

          const previewEvent =
            await widgetApi.sendStateEvent<DocumentPreviewEvent>(
              STATE_EVENT_DOCUMENT_PREVIEW,
              {
                preview: data.slice(0, maxSize),
              },
            );

          return { data: { event: previewEvent } };
        } catch (e) {
          return {
            error: {
              name: 'UpdateFailed',
              message: `Could not create document preview: ${
                isError(e) ? e.message : e
              }`,
            },
          };
        }
      },
    }),
  }),
});

export const { useGetDocumentPreviewQuery } = documentPreviewApi;
