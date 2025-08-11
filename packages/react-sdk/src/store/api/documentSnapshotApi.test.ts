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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { waitFor } from '@testing-library/react';
import { isEqual, range } from 'lodash';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockDocumentCreate,
  mockDocumentSnapshot,
  mockWhiteboardDocumentSnapshot,
} from '../../lib/testUtils/matrixTestUtils';
import {
  ROOM_EVENT_DOCUMENT_CHUNK,
  ROOM_EVENT_DOCUMENT_SNAPSHOT,
} from '../../model';
import { createStore } from '../store';
import { documentSnapshotApi, findLatestSnapshot } from './documentSnapshotApi';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getDocumentSnapshot', () => {
  it('should return a document snapshot', async () => {
    widgetApi.mockSendRoomEvent(mockDocumentCreate());

    const document = mockWhiteboardDocumentSnapshot();
    const { snapshot: snapshotEvent, chunks } = mockDocumentSnapshot({
      document,
    });
    widgetApi.mockSendRoomEvent(snapshotEvent);
    chunks.forEach(widgetApi.mockSendRoomEvent);

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(
          documentSnapshotApi.endpoints.getDocumentSnapshot.initiate({
            documentId: '$document-0',
          }),
        )
        .unwrap(),
    ).resolves.toEqual({
      event: snapshotEvent,
      data: chunks[0].content.data,
    });

    expect(widgetApi.readEventRelations).toHaveBeenCalledWith('$document-0', {
      limit: 50,
      relationType: 'm.reference',
      eventType: ROOM_EVENT_DOCUMENT_SNAPSHOT,
    });

    expect(widgetApi.readEventRelations).toHaveBeenCalledWith(
      '$document-snapshot-0',
      {
        limit: 1,
        relationType: 'm.reference',
        eventType: ROOM_EVENT_DOCUMENT_CHUNK,
      },
    );
  });

  it('should return a document snapshot from another room', async () => {
    widgetApi.mockSendRoomEvent(mockDocumentCreate());

    const document = mockWhiteboardDocumentSnapshot();
    const { snapshot: snapshotEvent, chunks } = mockDocumentSnapshot({
      document,
      room_id: '!room-id-1:example.com',
    });
    widgetApi.mockSendRoomEvent(snapshotEvent);
    chunks.forEach(widgetApi.mockSendRoomEvent);

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(
          documentSnapshotApi.endpoints.getDocumentSnapshot.initiate({
            documentId: '$document-0',
            roomId: '!room-id-1:example.com',
          }),
        )
        .unwrap(),
    ).resolves.toEqual({
      event: snapshotEvent,
      data: chunks[0].content.data,
    });

    expect(widgetApi.readEventRelations).toHaveBeenCalledWith('$document-0', {
      roomId: '!room-id-1:example.com',
      limit: 50,
      relationType: 'm.reference',
      eventType: ROOM_EVENT_DOCUMENT_SNAPSHOT,
    });

    expect(widgetApi.readEventRelations).toHaveBeenCalledWith(
      '$document-snapshot-0',
      {
        roomId: '!room-id-1:example.com',
        limit: 1,
        relationType: 'm.reference',
        eventType: ROOM_EVENT_DOCUMENT_CHUNK,
      },
    );
  });

  it('should fail if no document snapshot exists', async () => {
    widgetApi.mockSendRoomEvent(mockDocumentCreate());

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(
          documentSnapshotApi.endpoints.getDocumentSnapshot.initiate({
            documentId: '$document-0',
          }),
        )
        .unwrap(),
    ).rejects.toEqual({
      name: 'LoadFailed',
      message: 'Could not find the document',
    });
  });

  it('should fail if only an incomplete document snapshot exists', async () => {
    widgetApi.mockSendRoomEvent(mockDocumentCreate());

    const document = mockWhiteboardDocumentSnapshot();
    const { snapshot: snapshotEvent, chunks } = mockDocumentSnapshot({
      document,
      content: { chunkCount: 10 },
    });
    widgetApi.mockSendRoomEvent(snapshotEvent);
    chunks.forEach(widgetApi.mockSendRoomEvent);

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(
          documentSnapshotApi.endpoints.getDocumentSnapshot.initiate({
            documentId: '$document-0',
          }),
        )
        .unwrap(),
    ).rejects.toEqual({
      name: 'LoadFailed',
      message: 'Could not find the document',
    });
  });

  it('should fail if only an invalid document snapshot exists', async () => {
    widgetApi.mockSendRoomEvent(mockDocumentCreate());

    const document = mockWhiteboardDocumentSnapshot();
    const { snapshot: snapshotEvent, chunks } = mockDocumentSnapshot({
      document,
    });
    widgetApi.mockSendRoomEvent(snapshotEvent);
    chunks.forEach(widgetApi.mockSendRoomEvent);

    const validator = vi.fn().mockImplementation((data: Uint8Array) => {
      // snapshot is invalid
      if (isEqual(data, document.store())) {
        return false;
      }

      return true;
    });

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(
          documentSnapshotApi.endpoints.getDocumentSnapshot.initiate({
            documentId: '$document-0',
            validator,
          }),
        )
        .unwrap(),
    ).rejects.toEqual({
      name: 'LoadFailed',
      message: 'Could not find the document',
    });
  });

  it('should handle load errors', async () => {
    widgetApi.readEventRelations.mockRejectedValue(new Error('Some Error'));

    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(
          documentSnapshotApi.endpoints.getDocumentSnapshot.initiate({
            documentId: '$document-0',
          }),
        )
        .unwrap(),
    ).rejects.toEqual({
      message: 'Could not load the document: Some Error',
      name: 'LoadFailed',
    });
  });

  it('should observe document snapshots (chunk event completes snapshot)', async () => {
    widgetApi.mockSendRoomEvent(mockDocumentCreate());

    const document1 = mockWhiteboardDocumentSnapshot();
    const { snapshot: snapshotEvent1, chunks: chunks1 } = mockDocumentSnapshot({
      document: document1,
      origin_server_ts: 1000,
    });
    widgetApi.mockSendRoomEvent(snapshotEvent1);
    chunks1.forEach(widgetApi.mockSendRoomEvent);

    const store = createStore({ widgetApi });

    store.dispatch(
      documentSnapshotApi.endpoints.getDocumentSnapshot.initiate({
        documentId: '$document-0',
      }),
    );

    await waitFor(() =>
      expect(
        documentSnapshotApi.endpoints.getDocumentSnapshot.select({
          documentId: '$document-0',
        })(store.getState()).data,
      ).toEqual({
        event: snapshotEvent1,
        data: chunks1[0].content.data,
      }),
    );

    expect(widgetApi.observeRoomEvents).toHaveBeenCalledWith(
      ROOM_EVENT_DOCUMENT_SNAPSHOT,
      undefined,
    );
    expect(widgetApi.observeRoomEvents).toHaveBeenCalledWith(
      ROOM_EVENT_DOCUMENT_CHUNK,
      undefined,
    );

    const document2 = mockWhiteboardDocumentSnapshot();
    const { snapshot: snapshotEvent2, chunks: chunks2 } = mockDocumentSnapshot({
      document: document2,
      origin_server_ts: 2000,
    });
    // send snapshot first
    widgetApi.mockSendRoomEvent(snapshotEvent2);
    chunks2.forEach(widgetApi.mockSendRoomEvent);

    await waitFor(() =>
      expect(
        documentSnapshotApi.endpoints.getDocumentSnapshot.select({
          documentId: '$document-0',
        })(store.getState()).data,
      ).toEqual({
        event: snapshotEvent2,
        data: chunks2[0].content.data,
      }),
    );
  });

  it('should observe document snapshots (chunk event completes snapshot) from another room', async () => {
    widgetApi.mockSendRoomEvent(mockDocumentCreate());

    const document1 = mockWhiteboardDocumentSnapshot();
    const { snapshot: snapshotEvent1, chunks: chunks1 } = mockDocumentSnapshot({
      document: document1,
      origin_server_ts: 1000,
      room_id: '!room-id-1:example.com',
    });
    widgetApi.mockSendRoomEvent(snapshotEvent1);
    chunks1.forEach(widgetApi.mockSendRoomEvent);

    const store = createStore({ widgetApi });

    store.dispatch(
      documentSnapshotApi.endpoints.getDocumentSnapshot.initiate({
        documentId: '$document-0',
        roomId: '!room-id-1:example.com',
      }),
    );

    await waitFor(() =>
      expect(
        documentSnapshotApi.endpoints.getDocumentSnapshot.select({
          documentId: '$document-0',
          roomId: '!room-id-1:example.com',
        })(store.getState()).data,
      ).toEqual({
        event: snapshotEvent1,
        data: chunks1[0].content.data,
      }),
    );

    expect(widgetApi.observeRoomEvents).toHaveBeenCalledWith(
      ROOM_EVENT_DOCUMENT_SNAPSHOT,
      {
        roomIds: ['!room-id-1:example.com'],
      },
    );
    expect(widgetApi.observeRoomEvents).toHaveBeenCalledWith(
      ROOM_EVENT_DOCUMENT_CHUNK,
      {
        roomIds: ['!room-id-1:example.com'],
      },
    );

    const document2 = mockWhiteboardDocumentSnapshot();
    const { snapshot: snapshotEvent2, chunks: chunks2 } = mockDocumentSnapshot({
      document: document2,
      origin_server_ts: 2000,
      room_id: '!room-id-1:example.com',
    });
    // send snapshot first
    widgetApi.mockSendRoomEvent(snapshotEvent2);
    chunks2.forEach(widgetApi.mockSendRoomEvent);

    await waitFor(() =>
      expect(
        documentSnapshotApi.endpoints.getDocumentSnapshot.select({
          documentId: '$document-0',
          roomId: '!room-id-1:example.com',
        })(store.getState()).data,
      ).toEqual({
        event: snapshotEvent2,
        data: chunks2[0].content.data,
      }),
    );
  });

  it('should observe document snapshots (snapshot event completes snapshot)', async () => {
    widgetApi.mockSendRoomEvent(mockDocumentCreate());

    const document1 = mockWhiteboardDocumentSnapshot();
    const { snapshot: snapshotEvent1, chunks: chunks1 } = mockDocumentSnapshot({
      document: document1,
      origin_server_ts: 1000,
    });
    widgetApi.mockSendRoomEvent(snapshotEvent1);
    chunks1.forEach(widgetApi.mockSendRoomEvent);

    const store = createStore({ widgetApi });

    store.dispatch(
      documentSnapshotApi.endpoints.getDocumentSnapshot.initiate({
        documentId: '$document-0',
      }),
    );

    await waitFor(() =>
      expect(
        documentSnapshotApi.endpoints.getDocumentSnapshot.select({
          documentId: '$document-0',
        })(store.getState()).data,
      ).toEqual({
        event: snapshotEvent1,
        data: chunks1[0].content.data,
      }),
    );

    const document2 = mockWhiteboardDocumentSnapshot();
    const { snapshot: snapshotEvent2, chunks: chunks2 } = mockDocumentSnapshot({
      document: document2,
      origin_server_ts: 2000,
    });
    // send the chunks first
    chunks2.forEach(widgetApi.mockSendRoomEvent);
    widgetApi.mockSendRoomEvent(snapshotEvent2);

    await waitFor(() =>
      expect(
        documentSnapshotApi.endpoints.getDocumentSnapshot.select({
          documentId: '$document-0',
        })(store.getState()).data,
      ).toEqual({
        event: snapshotEvent2,
        data: chunks2[0].content.data,
      }),
    );
  });

  it('should observe document snapshots when the initial request fails', async () => {
    widgetApi.mockSendRoomEvent(mockDocumentCreate());

    const store = createStore({ widgetApi });

    store.dispatch(
      documentSnapshotApi.endpoints.getDocumentSnapshot.initiate({
        documentId: '$document-0',
      }),
    );

    await waitFor(() =>
      expect(
        documentSnapshotApi.endpoints.getDocumentSnapshot.select({
          documentId: '$document-0',
        })(store.getState()),
      ).toEqual(
        expect.objectContaining({
          isError: true,
          error: {
            name: 'LoadFailed',
            message: 'Could not find the document',
          },
        }),
      ),
    );

    const document2 = mockWhiteboardDocumentSnapshot();
    const { snapshot: snapshotEvent2, chunks: chunks2 } = mockDocumentSnapshot({
      document: document2,
      origin_server_ts: 2000,
    });
    widgetApi.mockSendRoomEvent(snapshotEvent2);
    chunks2.forEach(widgetApi.mockSendRoomEvent);

    await waitFor(() =>
      expect(
        documentSnapshotApi.endpoints.getDocumentSnapshot.select({
          documentId: '$document-0',
        })(store.getState()).data,
      ).toEqual({
        event: snapshotEvent2,
        data: chunks2[0].content.data,
      }),
    );
  });
});

describe('createDocument', () => {
  it('should create a new document', async () => {
    const store = createStore({ widgetApi });

    await expect(
      store
        .dispatch(documentSnapshotApi.endpoints.createDocument.initiate())
        .unwrap(),
    ).resolves.toEqual({
      event: expect.objectContaining({
        content: {},
        type: 'net.nordeck.whiteboard.document.create',
      }),
    });

    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      'net.nordeck.whiteboard.document.create',
      {},
    );
  });

  it('should reject on error', async () => {
    const store = createStore({ widgetApi });

    widgetApi.sendRoomEvent.mockRejectedValue(new Error('Some Error'));

    await expect(
      store
        .dispatch(documentSnapshotApi.endpoints.createDocument.initiate())
        .unwrap(),
    ).rejects.toEqual({
      name: 'UpdateFailed',
      message: 'Could not create a document: Some Error',
    });

    expect(widgetApi.sendStateEvent).not.toHaveBeenCalled();
  });
});

describe('createDocumentSnapshot', () => {
  it('should create a new document snapshot', async () => {
    const store = createStore({ widgetApi });

    const result = await store
      .dispatch(
        documentSnapshotApi.endpoints.createDocumentSnapshot.initiate({
          documentId: '$document-0',
          data: new Uint8Array([0, 8, 15]),
        }),
      )
      .unwrap();

    expect(result).toEqual({
      event: expect.objectContaining({
        content: {
          chunkCount: 1,
          'm.relates_to': {
            rel_type: 'm.reference',
            event_id: '$document-0',
          },
        },
        type: 'net.nordeck.whiteboard.document.snapshot',
      }),
    });

    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      'net.nordeck.whiteboard.document.snapshot',
      {
        chunkCount: 1,
        'm.relates_to': {
          rel_type: 'm.reference',
          event_id: '$document-0',
        },
      },
    );
    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      'net.nordeck.whiteboard.document.chunk',
      {
        documentId: '$document-0',
        sequenceNumber: 0,
        data: 'AAgP',
        'm.relates_to': {
          rel_type: 'm.reference',
          event_id: result.event.event_id,
        },
      },
    );
  });

  it('should accept failing chunks', async () => {
    widgetApi.sendRoomEvent
      .mockImplementationOnce(async <T>(type: string, content: T) => ({
        type,
        content,
        event_id: '$snapshot-event-id',
        origin_server_ts: 0,
        room_id: ':example.com',
        sender: '@user-id:example.com',
      }))
      .mockRejectedValueOnce(new Error('Timeout'));

    const store = createStore({ widgetApi });

    const result = await store
      .dispatch(
        documentSnapshotApi.endpoints.createDocumentSnapshot.initiate({
          documentId: '$document-0',
          data: new Uint8Array([0, 8, 15, ...range(0, 60000)]),
        }),
      )
      .unwrap();

    expect(result).toEqual({
      event: expect.objectContaining({
        content: {
          chunkCount: 2,
          'm.relates_to': {
            rel_type: 'm.reference',
            event_id: '$document-0',
          },
        },
        type: 'net.nordeck.whiteboard.document.snapshot',
      }),
    });

    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      'net.nordeck.whiteboard.document.snapshot',
      {
        chunkCount: 2,
        'm.relates_to': {
          rel_type: 'm.reference',
          event_id: '$document-0',
        },
      },
    );
    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      'net.nordeck.whiteboard.document.chunk',
      {
        documentId: '$document-0',
        sequenceNumber: 0,
        data: expect.any(String),
        'm.relates_to': {
          rel_type: 'm.reference',
          event_id: result.event.event_id,
        },
      },
    );
    expect(widgetApi.sendRoomEvent).toHaveBeenCalledWith(
      'net.nordeck.whiteboard.document.chunk',
      {
        documentId: '$document-0',
        sequenceNumber: 1,
        data: expect.any(String),
        'm.relates_to': {
          rel_type: 'm.reference',
          event_id: result.event.event_id,
        },
      },
    );
  });

  it('should reject on error', async () => {
    const store = createStore({ widgetApi });

    widgetApi.sendRoomEvent.mockRejectedValue(new Error('Some Error'));

    await expect(
      store
        .dispatch(
          documentSnapshotApi.endpoints.createDocumentSnapshot.initiate({
            documentId: '$document-0',
            data: new Uint8Array([0, 8, 15]),
          }),
        )
        .unwrap(),
    ).rejects.toEqual({
      name: 'UpdateFailed',
      message: 'Could not create document snapshot: Some Error',
    });

    expect(widgetApi.sendStateEvent).not.toHaveBeenCalled();
  });
});

describe('findLatestSnapshot', () => {
  it('should paginate to find all snapshots', async () => {
    widgetApi.readEventRelations
      .mockResolvedValueOnce({
        chunk: [],
        nextToken: 'next-token',
      })
      .mockResolvedValueOnce({
        chunk: [],
        nextToken: undefined,
      });

    await expect(
      findLatestSnapshot(widgetApi, '$document-0'),
    ).resolves.toBeUndefined();

    expect(widgetApi.readEventRelations).toHaveBeenCalledTimes(2);
    expect(widgetApi.readEventRelations).toHaveBeenCalledWith('$document-0', {
      eventType: 'net.nordeck.whiteboard.document.snapshot',
      from: undefined,
      limit: 50,
      relationType: 'm.reference',
    });
    expect(widgetApi.readEventRelations).toHaveBeenCalledWith('$document-0', {
      eventType: 'net.nordeck.whiteboard.document.snapshot',
      from: 'next-token',
      limit: 50,
      relationType: 'm.reference',
    });
  });

  it('should paginate to find all chunks', async () => {
    widgetApi.readEventRelations
      .mockResolvedValueOnce({
        chunk: [mockDocumentSnapshot().snapshot],
        nextToken: undefined,
      })
      .mockResolvedValueOnce({
        chunk: [],
        nextToken: 'next-token',
      })
      .mockResolvedValueOnce({
        chunk: [],
        nextToken: undefined,
      });

    await expect(
      findLatestSnapshot(widgetApi, '$document-0'),
    ).resolves.toBeUndefined();

    expect(widgetApi.readEventRelations).toHaveBeenCalledTimes(3);
    expect(widgetApi.readEventRelations).toHaveBeenCalledWith('$document-0', {
      eventType: 'net.nordeck.whiteboard.document.snapshot',
      from: undefined,
      limit: 50,
      relationType: 'm.reference',
    });
    expect(widgetApi.readEventRelations).toHaveBeenCalledWith(
      '$document-snapshot-0',
      {
        eventType: 'net.nordeck.whiteboard.document.chunk',
        from: undefined,
        limit: 1,
        relationType: 'm.reference',
      },
    );
    expect(widgetApi.readEventRelations).toHaveBeenCalledWith(
      '$document-snapshot-0',
      {
        eventType: 'net.nordeck.whiteboard.document.chunk',
        from: 'next-token',
        limit: 1,
        relationType: 'm.reference',
      },
    );
  });

  it('should paginate chunks with a maximum page size of 50', async () => {
    widgetApi.readEventRelations
      .mockResolvedValueOnce({
        chunk: [
          mockDocumentSnapshot({ content: { chunkCount: 100 } }).snapshot,
        ],
        nextToken: undefined,
      })
      .mockResolvedValueOnce({
        chunk: [],
        nextToken: undefined,
      });

    await expect(
      findLatestSnapshot(widgetApi, '$document-0'),
    ).resolves.toBeUndefined();

    expect(widgetApi.readEventRelations).toHaveBeenCalledTimes(2);
    expect(widgetApi.readEventRelations).toHaveBeenCalledWith('$document-0', {
      eventType: 'net.nordeck.whiteboard.document.snapshot',
      from: undefined,
      limit: 50,
      relationType: 'm.reference',
    });
    expect(widgetApi.readEventRelations).toHaveBeenCalledWith(
      '$document-snapshot-0',
      {
        eventType: 'net.nordeck.whiteboard.document.chunk',
        from: undefined,
        limit: 50,
        relationType: 'm.reference',
      },
    );
  });
});
