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

import { RoomEvent, WidgetApi } from '@matrix-widget-toolkit/api';
import { defaultSerializeQueryArgs } from '@reduxjs/toolkit/query';
import { Base64 } from 'js-base64';
import { isError, range } from 'lodash';
import { getLogger } from 'loglevel';
import { filter } from 'rxjs';
import {
  DocumentChunk,
  DocumentCreate,
  DocumentSnapshot,
  ROOM_EVENT_DOCUMENT_CHUNK,
  ROOM_EVENT_DOCUMENT_SNAPSHOT,
  isValidDocumentChunkRoomEvent,
  isValidDocumentSnapshotRoomEvent,
} from '../../model';
import { ROOM_EVENT_DOCUMENT_CREATE } from '../../model/documentCreate';
import { ThunkExtraArgument } from '../store';
import { baseApi } from './baseApi';
import {
  DocumentSnapshotBacklog,
  DocumentSnapshotValidator,
} from './documentSnapshotBacklog';

// TODO: detect history error...

/**
 * Endpoints to store and receive document snapshots in a matrix room.
 *
 * @remarks This api extends the {@link baseApi} and should
 *          not be registered at the store.
 */
export const documentSnapshotApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    /** Receive the document the list of all whiteboards in the current room */
    getDocumentSnapshot: builder.query<
      {
        event: RoomEvent<DocumentSnapshot>;
        data: string;
      },
      {
        documentId: string;
        validator?: DocumentSnapshotValidator;
        roomId?: string;
      }
    >({
      // don't include the validator in the cache key. this is also added in
      // the serializableCheck of the getDefaultMiddleware.
      serializeQueryArgs({ queryArgs, endpointDefinition, endpointName }) {
        const { documentId } = queryArgs;

        return defaultSerializeQueryArgs({
          endpointName,
          queryArgs: { documentId },
          endpointDefinition,
        });
      },

      // do the initial loading
      async queryFn({ documentId, validator, roomId }, { extra }) {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          // sets room id if it is different to widget parameter to avoid capability request
          const roomIdParameter: string | undefined =
            roomId && roomId !== widgetApi.widgetParameters.roomId
              ? roomId
              : undefined;

          const snapshotResult = await findLatestSnapshot(
            widgetApi,
            documentId,
            validator,
            roomIdParameter,
          );

          if (!snapshotResult) {
            return {
              error: {
                name: 'LoadFailed',
                message: 'Could not find the document',
              },
            };
          }

          return {
            data: {
              event: snapshotResult.snapshot,
              data: snapshotResult.data,
            },
          };
        } catch (e) {
          return {
            error: {
              name: 'LoadFailed',
              message: `Could not load the document: ${
                isError(e) ? e.message : JSON.stringify(e)
              }`,
            },
          };
        }
      },

      async onCacheEntryAdded(
        { documentId, validator, roomId },
        { cacheEntryRemoved, extra, getCacheEntry, dispatch },
      ) {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        const snapshotBacklog = new DocumentSnapshotBacklog(
          documentId,
          getCacheEntry().data?.event.origin_server_ts,
          validator,
        );

        // sets options with room id if different to widget parameter to avoid capability request
        const options =
          roomId && roomId !== widgetApi.widgetParameters.roomId
            ? { roomIds: [roomId] }
            : undefined;

        const snapshotSubscription = widgetApi
          .observeRoomEvents(ROOM_EVENT_DOCUMENT_SNAPSHOT, options)
          .pipe(filter(isValidDocumentSnapshotRoomEvent))
          .subscribe((snapshot) => {
            snapshotBacklog.registerSnapshot(snapshot);

            const result = snapshotBacklog.findCompleteSnapshot();
            if (result) {
              dispatch(
                documentSnapshotApi.util.upsertQueryData(
                  'getDocumentSnapshot',
                  { documentId, validator },
                  { event: result.snapshot, data: result.data },
                ),
              );
            }
          });

        const chunkSubscription = widgetApi
          .observeRoomEvents(ROOM_EVENT_DOCUMENT_CHUNK, options)
          .pipe(filter(isValidDocumentChunkRoomEvent))
          .subscribe((chunk) => {
            snapshotBacklog.registerChunk(chunk);

            const result = snapshotBacklog.findCompleteSnapshot();
            if (result) {
              dispatch(
                documentSnapshotApi.util.upsertQueryData(
                  'getDocumentSnapshot',
                  { documentId },
                  { event: result.snapshot, data: result.data },
                ),
              );
            }
          });

        // wait until subscription is cancelled
        await cacheEntryRemoved;

        snapshotSubscription.unsubscribe();
        chunkSubscription.unsubscribe();
      },
    }),

    /** Create the start anchor for a document where all snapshots relate to */
    createDocument: builder.mutation<
      { event: RoomEvent<DocumentCreate> },
      void
    >({
      async queryFn(_, { extra }) {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          const event = await widgetApi.sendRoomEvent<DocumentCreate>(
            ROOM_EVENT_DOCUMENT_CREATE,
            {},
          );

          return { data: { event } };
        } catch (e) {
          return {
            error: {
              name: 'UpdateFailed',
              message: `Could not create a document: ${
                isError(e) ? e.message : e
              }`,
            },
          };
        }
      },
    }),

    /**
     * Create a document snapshot in the current room.
     */
    createDocumentSnapshot: builder.mutation<
      { event: RoomEvent<DocumentSnapshot> },
      { documentId: string; data: Uint8Array }
    >({
      async queryFn({ documentId, data }, { extra }) {
        const widgetApi = await (extra as ThunkExtraArgument).widgetApi;

        try {
          // Based on https://spec.matrix.org/unstable/client-server-api/#size-limits and https://github.com/matrix-org/matrix-js-sdk/blob/7b10fa367df357b51c2e78e220d39e5e7967f9e3/src/crypto/OlmDevice.ts#L27-L29
          // keeping 4kb for headers, trailers, and signatures.
          const chunkSize = 34000;
          const chunkCount = Math.ceil(data.length / chunkSize);

          const snapshotEvent = await widgetApi.sendRoomEvent<DocumentSnapshot>(
            ROOM_EVENT_DOCUMENT_SNAPSHOT,
            {
              chunkCount,
              'm.relates_to': {
                rel_type: 'm.reference',
                event_id: documentId,
              },
            },
          );

          await Promise.all(
            createChunks(data, chunkCount, chunkSize).map(
              ({ i, data: chunkData }) =>
                // this is a best-effort operation. we ignore all exceptions.
                // the matrix client will handle an eventual rate limiting of
                // the room events asynchronously. it might take longer than
                // the timeout of the widget api to finish, so we won't be
                // notified if or when the call succeeded. We accept that this
                // will leave the possibility of partially saved snapshots.
                widgetApi
                  .sendRoomEvent<DocumentChunk>(ROOM_EVENT_DOCUMENT_CHUNK, {
                    documentId,
                    sequenceNumber: i,
                    data: chunkData,
                    'm.relates_to': {
                      rel_type: 'm.reference',
                      event_id: snapshotEvent.event_id,
                    },
                  })
                  .catch((e) => {
                    const logger = getLogger('documentSnapshotApi');
                    logger.warn('Error while writing a chunk into the room', e);
                  }),
            ),
          );

          return { data: { event: snapshotEvent } };
        } catch (e) {
          return {
            error: {
              name: 'UpdateFailed',
              message: `Could not create document snapshot: ${
                isError(e) ? e.message : e
              }`,
            },
          };
        }
      },
    }),
  }),
});

/**
 * Finds the newest complete snapshot that relates to a given document.
 *
 * @param widgetApi - the widget api
 * @param documentId - the id of the document that the snapshot belongs to.
 * @returns information about the snapshot and its chunks, or undefined if no
 *          snapshot was found.
 */
export async function findLatestSnapshot(
  widgetApi: WidgetApi,
  documentId: string,
  validator?: DocumentSnapshotValidator,
  roomId?: string,
): Promise<
  | undefined
  | {
      snapshot: RoomEvent<DocumentSnapshot>;
      chunks: RoomEvent<DocumentChunk>[];
      data: string;
    }
> {
  let fromSnapshot: string | undefined = undefined;

  do {
    const result = await widgetApi.readEventRelations(documentId, {
      roomId,
      limit: 50,
      relationType: 'm.reference',
      eventType: ROOM_EVENT_DOCUMENT_SNAPSHOT,
      from: fromSnapshot,
    });

    const snapshots = result.chunk.filter(isValidDocumentSnapshotRoomEvent);

    for (const snapshot of snapshots) {
      const backlog = new DocumentSnapshotBacklog(
        documentId,
        undefined,
        validator,
      );
      backlog.registerSnapshot(snapshot);

      for await (const chunk of findChunks(
        widgetApi,
        documentId,
        snapshot,
        roomId,
      )) {
        backlog.registerChunk(chunk);

        const result = backlog.findCompleteSnapshot();
        if (result) {
          return result;
        }
      }
    }

    fromSnapshot = result.nextToken as string | undefined;
  } while (fromSnapshot);

  return undefined;
}

/**
 * A generator that yields all chunks that relate to the document.
 *
 * @param widgetApi - the widget api
 * @param documentId - the id of the document that the snapshot belongs to.
 * @param snapshotEvent - the snapshot event the chunks are related to
 */
async function* findChunks(
  widgetApi: WidgetApi,
  _documentId: string,
  snapshotEvent: RoomEvent<DocumentSnapshot>,
  roomId?: string,
): AsyncGenerator<RoomEvent<DocumentChunk>> {
  let fromChunk: string | undefined = undefined;

  do {
    const result = await widgetApi.readEventRelations(snapshotEvent.event_id, {
      roomId,
      limit: Math.min(50, snapshotEvent.content.chunkCount),
      relationType: 'm.reference',
      eventType: ROOM_EVENT_DOCUMENT_CHUNK,
      from: fromChunk,
    });

    for (const chunk of result.chunk.filter(isValidDocumentChunkRoomEvent)) {
      yield chunk;
    }

    fromChunk = result.nextToken as string | undefined;
  } while (fromChunk !== undefined);
}

export function createChunks(
  data: Uint8Array,
  chunkCount: number,
  chunkSize?: number,
): Array<{ i: number; data: string }> {
  const size = chunkSize ?? data.length / chunkCount;

  return range(0, chunkCount).map((i) => ({
    i,
    data: Base64.fromUint8Array(data.subarray(i * size, (i + 1) * size)),
  }));
}

// consume the store using the hooks generated by RTK Query
export const { useCreateDocumentMutation } = documentSnapshotApi;
