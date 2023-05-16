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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { waitFor } from '@testing-library/react';
import { Base64 } from 'js-base64';
import {
  filter,
  firstValueFrom,
  lastValueFrom,
  NEVER,
  skip,
  Subject,
  take,
  toArray,
} from 'rxjs';
import * as Y from 'yjs';
import {
  mockDocumentCreate,
  mockDocumentSnapshot,
  mockWhiteboard,
} from '../lib/testUtils/matrixTestUtils';
import { createStore } from '../store';
import { CommunicationChannel, Message } from './communication';
import { ChangeFn, Document } from './crdt';
import { createMigrations, SharedMap, YDocument, YMap } from './crdt/y';
import { DocumentStorage } from './storage';
import { SynchronizedDocumentImpl } from './synchronizedDocumentImpl';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

afterEach(() => jest.useRealTimers());

describe('SynchronizedDocumentImpl', () => {
  let communicationChannel: jest.Mocked<CommunicationChannel>;
  let storage: jest.Mocked<DocumentStorage>;
  let messageChannel: Subject<Message>;

  beforeEach(async () => {
    messageChannel = new Subject<Message>();
    communicationChannel = {
      broadcastMessage: jest.fn(),
      observeMessages: jest.fn().mockReturnValue(messageChannel),
      getStatistics: jest.fn(),
      observeStatistics: jest.fn().mockReturnValue(NEVER),
      destroy: jest.fn(),
    };
    storage = {
      load: jest.fn().mockResolvedValue(undefined),
      store: jest.fn().mockResolvedValue(undefined),
    };

    widgetApi.mockSendStateEvent(mockWhiteboard());
    widgetApi.mockSendRoomEvent(mockDocumentCreate());
  });

  it('should start in loading state', async () => {
    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0'
    );
    const loading = await firstValueFrom(
      synchronizedDocument.observeIsLoading()
    );

    expect(loading).toBe(true);
  });

  it('should apply real time update', async () => {
    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0'
    );
    const statistics = firstValueFrom(
      synchronizedDocument.observeDocumentStatistics()
    );

    const { diff } = await mockUpdate((doc) => doc.set('num', 10));
    messageChannel.next({
      type: 'net.nordeck.whiteboard.document_update',
      content: {
        data: Base64.fromUint8Array(diff),
        documentId: '$document-0',
      },
      senderUserId: '',
      senderSessionId: '',
    });

    expect(doc.getData().toJSON()).toEqual({
      num: 10,
      text: '',
    });

    expect(await statistics).toEqual({
      contentSizeInBytes: 20,
      documentSizeInBytes: expect.any(Number),
      snapshotOutstanding: false,
      snapshotsReceived: 0,
      snapshotsSend: 0,
    });
  });

  it('should ignore invalid document after merging a real-time update', async () => {
    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0',
      {
        documentValidator: isValidExampleDocument,
        snapshotValidator: isValidExampleDocumentSnapshot,
      }
    );
    const statistics = firstValueFrom(
      synchronizedDocument.observeDocumentStatistics()
    );

    const { diff: diff0 } = await mockUpdate((doc) =>
      (doc as YMap<unknown>).set('text', 10)
    );
    messageChannel.next({
      type: 'net.nordeck.whiteboard.document_update',
      content: {
        data: Base64.fromUint8Array(diff0),
        documentId: '$document-0',
      },
      senderUserId: '',
      senderSessionId: '',
    });

    const { diff } = await mockUpdate((doc) => doc.set('num', 10));
    messageChannel.next({
      type: 'net.nordeck.whiteboard.document_update',
      content: {
        data: Base64.fromUint8Array(diff),
        documentId: '$document-0',
      },
      senderUserId: '',
      senderSessionId: '',
    });

    expect(doc.getData().toJSON()).toEqual({
      num: 10,
      text: '',
    });

    expect(await statistics).toEqual({
      contentSizeInBytes: 20,
      documentSizeInBytes: expect.any(Number),
      snapshotOutstanding: false,
      snapshotsReceived: 0,
      snapshotsSend: 0,
    });
  });

  it('should ignore real time update for another document', async () => {
    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0'
    );
    const statistics = firstValueFrom(
      synchronizedDocument.observeDocumentStatistics()
    );

    const { diff: diff0 } = await mockUpdate((doc) =>
      doc.get('text').insert(0, 'Hello')
    );
    messageChannel.next({
      type: 'net.nordeck.whiteboard.document_update',
      content: {
        data: Base64.fromUint8Array(diff0),
        documentId: '$document-1',
      },
      senderUserId: '',
      senderSessionId: '',
    });

    const { diff } = await mockUpdate((doc) => doc.set('num', 10));
    messageChannel.next({
      type: 'net.nordeck.whiteboard.document_update',
      content: {
        data: Base64.fromUint8Array(diff),
        documentId: '$document-0',
      },
      senderUserId: '',
      senderSessionId: '',
    });

    expect(doc.getData().toJSON()).toEqual({
      num: 10,
      text: '',
    });

    expect(await statistics).toEqual({
      contentSizeInBytes: 20,
      documentSizeInBytes: expect.any(Number),
      snapshotOutstanding: false,
      snapshotsReceived: 0,
      snapshotsSend: 0,
    });
  });

  it('should ignore other types of messages that are received by the real-time channel', async () => {
    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0'
    );
    const statistics = firstValueFrom(
      synchronizedDocument.observeDocumentStatistics()
    );

    const { diff: diff0 } = await mockUpdate((doc) =>
      doc.get('text').insert(0, 'Hello')
    );
    messageChannel.next({
      type: 'other_message',
      content: {
        data: Base64.fromUint8Array(diff0),
        documentId: '$document-0',
      },
      senderUserId: '',
      senderSessionId: '',
    });

    const { diff } = await mockUpdate((doc) => doc.set('num', 10));
    messageChannel.next({
      type: 'net.nordeck.whiteboard.document_update',
      content: {
        data: Base64.fromUint8Array(diff),
        documentId: '$document-0',
      },
      senderUserId: '',
      senderSessionId: '',
    });

    expect(doc.getData().toJSON()).toEqual({
      num: 10,
      text: '',
    });

    expect(await statistics).toEqual({
      contentSizeInBytes: 20,
      documentSizeInBytes: expect.any(Number),
      snapshotOutstanding: false,
      snapshotsReceived: 0,
      snapshotsSend: 0,
    });
  });

  it('should publish changes to the communication channel', async () => {
    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0'
    );
    const statistics = firstValueFrom(
      synchronizedDocument.observeDocumentStatistics()
    );

    doc.performChange((doc) => doc.set('num', 10));

    expect(communicationChannel.broadcastMessage).toBeCalledWith(
      'net.nordeck.whiteboard.document_update',
      { documentId: '$document-0', data: expect.any(String) }
    );

    expect(await statistics).toEqual({
      contentSizeInBytes: 20,
      documentSizeInBytes: expect.any(Number),
      snapshotOutstanding: false,
      snapshotsReceived: 0,
      snapshotsSend: 0,
    });
  });

  it('should load initial snapshot from local storage', async () => {
    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const { document } = await mockUpdate((doc) => doc.set('num', 10));
    storage.load.mockImplementation(async (documentId) =>
      documentId === '$document-0' ? document.store() : undefined
    );

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0'
    );
    const statistics = firstValueFrom(
      synchronizedDocument.observeDocumentStatistics()
    );

    await waitFor(() => {
      expect(doc.getData().toJSON()).toEqual({
        num: 10,
        text: '',
      });
    });

    expect(await statistics).toEqual({
      contentSizeInBytes: 20,
      documentSizeInBytes: expect.any(Number),
      snapshotOutstanding: false,
      snapshotsReceived: 0,
      snapshotsSend: 0,
    });
  });

  it('should ignore invalid snapshot from local storage', async () => {
    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const { document: invalidDocument } = await mockUpdate((doc) => {
      (doc as YMap<unknown>).set('text', 5);
    });
    storage.load.mockImplementation(async (documentId) =>
      documentId === '$document-0' ? invalidDocument.store() : undefined
    );

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0',
      {
        documentValidator: isValidExampleDocument,
        snapshotValidator: isValidExampleDocumentSnapshot,
      }
    );
    const statistics = firstValueFrom(
      synchronizedDocument.observeDocumentStatistics()
    );

    const { document } = await mockUpdate((doc) => doc.set('num', 10));
    const { snapshot, chunks } = mockDocumentSnapshot({ document });
    widgetApi.mockSendRoomEvent(snapshot);
    chunks.forEach(widgetApi.mockSendRoomEvent);

    await waitFor(() => {
      expect(doc.getData().toJSON()).toEqual({
        num: 10,
        text: '',
      });
    });

    expect(await statistics).toEqual({
      contentSizeInBytes: 19,
      documentSizeInBytes: expect.any(Number),
      snapshotOutstanding: false,
      snapshotsReceived: 1,
      snapshotsSend: 0,
    });
  });

  it('should merge a snapshot stored in the room', async () => {
    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0'
    );
    const statistics = firstValueFrom(
      synchronizedDocument.observeDocumentStatistics().pipe(take(2), toArray())
    );
    const loading = firstValueFrom(
      synchronizedDocument.observeIsLoading().pipe(take(2), toArray())
    );

    const { document } = await mockUpdate((doc) => doc.set('num', 10));
    const { snapshot, chunks } = mockDocumentSnapshot({ document });
    widgetApi.mockSendRoomEvent(snapshot);
    chunks.forEach(widgetApi.mockSendRoomEvent);

    await waitFor(() => {
      expect(doc.getData().toJSON()).toEqual({
        num: 10,
        text: '',
      });
    });

    expect(storage.store).toBeCalledWith('$document-0', doc.store());

    expect(await statistics).toEqual([
      {
        contentSizeInBytes: 19,
        documentSizeInBytes: expect.any(Number),
        snapshotOutstanding: false,
        snapshotsReceived: 1,
        snapshotsSend: 0,
      },
      {
        contentSizeInBytes: 20,
        documentSizeInBytes: expect.any(Number),
        snapshotOutstanding: false,
        snapshotsReceived: 1,
        snapshotsSend: 0,
      },
    ]);
    expect(await loading).toEqual([true, false]);
  });

  it('should skip invalid snapshots stored in the room', async () => {
    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0',
      {
        documentValidator: isValidExampleDocument,
        snapshotValidator: isValidExampleDocumentSnapshot,
      }
    );

    // send an invalid snapshot that is newer than the correct one
    const { document: invalidDocument } = await mockUpdate((doc) => {
      (doc as YMap<unknown>).set('num', 'text');
    });
    const { snapshot: invalidSnapshot, chunks: invalidChunks } =
      mockDocumentSnapshot({
        document: invalidDocument,
        event_id: '$document-snapshot-1',
        origin_server_ts: 1000,
      });
    widgetApi.mockSendRoomEvent(invalidSnapshot);
    invalidChunks.forEach(widgetApi.mockSendRoomEvent);

    const { document } = await mockUpdate((doc) => doc.set('num', 10));
    const { snapshot, chunks } = mockDocumentSnapshot({ document });
    widgetApi.mockSendRoomEvent(snapshot);
    chunks.forEach(widgetApi.mockSendRoomEvent);

    await waitFor(() => {
      expect(doc.getData().toJSON()).toEqual({
        num: 10,
        text: '',
      });
    });
  });

  it('should persist snapshot to local storage', async () => {
    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0'
    );

    const outstandingStatistics = firstValueFrom(
      synchronizedDocument.observeDocumentStatistics()
    );

    doc.performChange((doc) => doc.set('num', 10));

    expect(await outstandingStatistics).toEqual({
      contentSizeInBytes: 20,
      documentSizeInBytes: expect.any(Number),
      snapshotOutstanding: false,
      snapshotsReceived: 0,
      snapshotsSend: 0,
    });

    expect(storage.store).toBeCalledWith('$document-0', expect.any(Uint8Array));
  });

  it('should persist a snapshot in the room', async () => {
    jest.useFakeTimers();

    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0'
    );

    const outstandingStatistics = firstValueFrom(
      synchronizedDocument.observeDocumentStatistics().pipe(take(2), toArray())
    );
    const statistics = firstValueFrom(
      synchronizedDocument.observeDocumentStatistics().pipe(skip(2))
    );

    const isReady = firstValueFrom(
      synchronizedDocument
        .observeIsLoading()
        .pipe(filter((loading) => !loading))
    );

    doc.performChange((doc) => doc.set('num', 10));

    expect(await outstandingStatistics).toEqual([
      {
        contentSizeInBytes: 20,
        documentSizeInBytes: expect.any(Number),
        snapshotOutstanding: false,
        snapshotsReceived: 0,
        snapshotsSend: 0,
      },
      {
        contentSizeInBytes: 20,
        documentSizeInBytes: expect.any(Number),
        snapshotOutstanding: true,
        snapshotsReceived: 0,
        snapshotsSend: 0,
      },
    ]);

    await isReady;

    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(widgetApi.sendRoomEvent).toBeCalledTimes(2);
    });

    expect(await statistics).toEqual({
      contentSizeInBytes: 20,
      documentSizeInBytes: expect.any(Number),
      snapshotOutstanding: false,
      snapshotsReceived: 0,
      snapshotsSend: 1,
    });
  });

  it('should skip persist calls if the snapshot creation is slower than the emit interval', async () => {
    jest.useFakeTimers();

    const emitResponse = new Subject<void>();

    widgetApi.sendRoomEvent.mockImplementation(async (type, content) => {
      if (type === 'net.nordeck.whiteboard.document.snapshot') {
        return widgetApi.mockSendRoomEvent({
          type,
          content,
          event_id: '$snapshot-event-id',
          origin_server_ts: 0,
          room_id: '!room-id',
          sender: '@user-id',
        });
      }

      if (type === 'net.nordeck.whiteboard.document.chunk') {
        // wait until the subject is completed
        await lastValueFrom(emitResponse, { defaultValue: 0 });

        return widgetApi.mockSendRoomEvent({
          type,
          content,
          event_id: '$chunk-event-id',
          origin_server_ts: 0,
          room_id: '!room-id',
          sender: '@user-id',
        });
      }

      throw new Error('Unexpected event type');
    });

    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0'
    );

    const isReady = firstValueFrom(
      synchronizedDocument
        .observeIsLoading()
        .pipe(filter((loading) => !loading))
    );
    await isReady;

    doc.performChange((doc) => doc.set('num', 10));
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      expect(widgetApi.sendRoomEvent).toBeCalledTimes(2);
    });

    doc.performChange((doc) => doc.set('num', 11));
    jest.advanceTimersByTime(5000);
    doc.performChange((doc) => doc.set('num', 12));
    jest.advanceTimersByTime(5000);

    emitResponse.complete();

    // forcefully clear the event loop
    for (let i = 0; i < 100; i++) {
      await Promise.resolve();
    }

    expect(widgetApi.sendRoomEvent).toBeCalledTimes(4);
  });

  it('should return the document', () => {
    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0'
    );

    expect(synchronizedDocument.getDocument()).toEqual(doc);
  });

  it('should close observables on destroy', async () => {
    const doc = createExampleDocument();
    const store = createStore({ widgetApi });

    const synchronizedDocument = new SynchronizedDocumentImpl(
      doc,
      store,
      communicationChannel,
      storage,
      '$document-0'
    );

    const statistics = firstValueFrom(
      synchronizedDocument.observeDocumentStatistics().pipe(toArray())
    );
    const loading = firstValueFrom(
      synchronizedDocument.observeDocumentStatistics().pipe(toArray())
    );

    synchronizedDocument.destroy();

    expect(await statistics).toEqual([]);
    expect(await loading).toEqual([]);
  });
});

type Example = {
  num: number;
  text: Y.Text;
};

function initMigration(doc: SharedMap<Example>) {
  doc.set('num', 5);
  doc.set('text', new Y.Text());
}

const exampleMigrations = createMigrations([initMigration], '0');

function createExampleDocument(): Document<Example> {
  return YDocument.create<Example>(exampleMigrations, '0');
}

async function mockUpdate(
  callback: ChangeFn<Example>
): Promise<{ diff: Uint8Array; document: Document<Example> }> {
  const document = createExampleDocument();
  const change = firstValueFrom(document.observePublish());
  document.performChange(callback);
  const diff = await change;
  return { diff, document };
}

function isValidExampleDocument(
  document: Document<Record<string, unknown>>
): document is Document<Example> {
  const doc = document as Document<Example>;

  const json = doc.getData().toJSON();

  return typeof json.num === 'number' && typeof json.text === 'string';
}

export function isValidExampleDocumentSnapshot(data: Uint8Array): boolean {
  const document = createExampleDocument();

  try {
    document.mergeFrom(data);
  } catch (ex) {
    return false;
  }

  return isValidExampleDocument(document);
}
