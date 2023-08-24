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

import { RoomEvent } from '@matrix-widget-toolkit/api';
import { Base64 } from 'js-base64';
import { isEqual } from 'lodash';
import {
  mockDocumentChunk,
  mockDocumentSnapshot,
  mockWhiteboardDocumentSnapshot,
} from '../../lib/testUtils/matrixTestUtils';
import { DocumentChunk, DocumentSnapshot } from '../../model';
import { Document, WhiteboardDocument } from '../../state';
import { createChunks } from './documentSnapshotApi';
import {
  DocumentSnapshotBacklog,
  combineChunks,
} from './documentSnapshotBacklog';

describe('DocumentSnapshotBacklog', () => {
  let document0: Document<WhiteboardDocument>;
  let snapshot0: RoomEvent<DocumentSnapshot>;
  let chunk0_0: RoomEvent<DocumentChunk>;

  let document1: Document<WhiteboardDocument>;
  let snapshot1: RoomEvent<DocumentSnapshot>;
  let chunk1_0: RoomEvent<DocumentChunk>;
  let chunk1_1: RoomEvent<DocumentChunk>;

  let document2: Document<WhiteboardDocument>;
  let snapshot2: RoomEvent<DocumentSnapshot>;
  let chunk2_0: RoomEvent<DocumentChunk>;
  let chunk2_1: RoomEvent<DocumentChunk>;

  beforeEach(() => {
    document0 = mockWhiteboardDocumentSnapshot();
    ({
      snapshot: snapshot0,
      chunks: [chunk0_0],
    } = mockDocumentSnapshot({
      event_id: '$document-snapshot-0',
      document: document0,
      origin_server_ts: 1000,
    }));

    document1 = mockWhiteboardDocumentSnapshot();
    ({
      snapshot: snapshot1,
      chunks: [chunk1_0, chunk1_1],
    } = mockDocumentSnapshot({
      event_id: '$document-snapshot-1',
      document: document1,
      chunkCount: 2,
      origin_server_ts: 2000,
      chunkOriginServerTs: [2002, 2001],
    }));

    document2 = mockWhiteboardDocumentSnapshot();
    ({
      snapshot: snapshot2,
      chunks: [chunk2_0, chunk2_1],
    } = mockDocumentSnapshot({
      event_id: '$document-snapshot-2',
      document: document2,
      chunkCount: 2,
      origin_server_ts: 3000,
    }));
  });

  it('should emit a snapshot with a single chunk', () => {
    const backlog = new DocumentSnapshotBacklog('$document-0');

    backlog.registerSnapshot(snapshot0);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk0_0);
    expect(backlog.findCompleteSnapshot()).toEqual({
      snapshot: snapshot0,
      chunks: [chunk0_0],
      data: createChunks(document0.store(), 1)[0].data,
    });
  });

  it('should emit a snapshot with a multiple chunks', () => {
    const backlog = new DocumentSnapshotBacklog('$document-0');

    backlog.registerSnapshot(snapshot1);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk1_1);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk1_0);
    expect(backlog.findCompleteSnapshot()).toEqual({
      snapshot: snapshot1,
      chunks: [chunk1_0, chunk1_1],
      data: createChunks(document1.store(), 1)[0].data,
    });
  });

  it('should skip snapshots before the original originServerTs', () => {
    const backlog = new DocumentSnapshotBacklog('$document-0', 1000);

    backlog.registerSnapshot(snapshot0);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk0_0);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();
  });

  it('should skip incomplete snapshots', () => {
    const backlog = new DocumentSnapshotBacklog('$document-0');

    backlog.registerSnapshot(snapshot2);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerSnapshot(snapshot1);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk1_1);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk1_0);
    expect(backlog.findCompleteSnapshot()).toEqual({
      snapshot: snapshot1,
      chunks: [chunk1_0, chunk1_1],
      data: createChunks(document1.store(), 1)[0].data,
    });
  });

  it('should emit the newest snapshot', () => {
    const backlog = new DocumentSnapshotBacklog('$document-0');

    backlog.registerSnapshot(snapshot1);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk1_1);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk1_0);
    expect(backlog.findCompleteSnapshot()).toEqual({
      snapshot: snapshot1,
      chunks: [chunk1_0, chunk1_1],
      data: createChunks(document1.store(), 1)[0].data,
    });

    // ignore older snapshot
    backlog.registerSnapshot(snapshot0);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk0_0);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    // emit newer snapshot
    backlog.registerSnapshot(snapshot2);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk2_0);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk2_1);
    expect(backlog.findCompleteSnapshot()).toEqual({
      snapshot: snapshot2,
      chunks: [chunk2_0, chunk2_1],
      data: createChunks(document2.store(), 1)[0].data,
    });
  });

  it('should skip invalid snapshot with custom validator', () => {
    const validator = jest.fn().mockImplementation((data: Uint8Array) => {
      // snapshot2 is invalid
      if (isEqual(data, document2.store())) {
        return false;
      }

      return true;
    });

    const backlog = new DocumentSnapshotBacklog('$document-0', 0, validator);

    backlog.registerSnapshot(snapshot1);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk1_1);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk1_0);
    expect(backlog.findCompleteSnapshot()).toEqual({
      snapshot: snapshot1,
      chunks: [chunk1_0, chunk1_1],
      data: createChunks(document1.store(), 1)[0].data,
    });

    // emit invalid snapshot
    backlog.registerSnapshot(snapshot2);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk2_0);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();

    backlog.registerChunk(chunk2_1);
    expect(backlog.findCompleteSnapshot()).toBeUndefined();
  });

  it('should vacuum stale snapshots and chunks', () => {
    const backlog = new DocumentSnapshotBacklog('$document-0');

    backlog.registerSnapshot(snapshot0);
    backlog.registerSnapshot(snapshot1);
    backlog.registerSnapshot(snapshot2);
    backlog.registerChunk(chunk0_0);
    backlog.registerChunk(chunk1_0);
    backlog.registerChunk(chunk1_1);
    backlog.registerChunk(chunk2_0);

    expect(backlog.snapshots).toEqual([snapshot2, snapshot1, snapshot0]);
    expect(backlog.chunks).toEqual([chunk0_0, chunk1_0, chunk2_0, chunk1_1]);

    backlog.findCompleteSnapshot();
    expect(backlog.snapshots).toEqual([snapshot2]);
    expect(backlog.chunks).toEqual([chunk2_0]);
  });

  it('should skip snapshots and chunks of other documents', () => {
    const backlog = new DocumentSnapshotBacklog('$document-1');

    backlog.registerSnapshot(snapshot0);
    backlog.registerChunk(chunk0_0);

    expect(backlog.snapshots).toEqual([]);
    expect(backlog.chunks).toEqual([]);
  });
});

describe('combineChunks', () => {
  it('should return a single chunk event', () => {
    const chunks = [
      mockDocumentChunk({
        event_id: '$chunk-0',
        content: {
          sequenceNumber: 0,
          data: 'RXhhbXBsZQ==', // Example
        },
      }),
    ];

    expect(Base64.fromUint8Array(combineChunks(chunks)!)).toEqual(
      'RXhhbXBsZQ==', // Example
    );
  });

  it('should combine multiple chunk events', () => {
    const chunks = [
      mockDocumentChunk({
        event_id: '$chunk-0',
        content: {
          sequenceNumber: 0,
          data: 'RXg=', // Ex
        },
      }),
      mockDocumentChunk({
        event_id: '$chunk-1',
        content: {
          sequenceNumber: 1,
          data: 'YW0=', // am
        },
      }),
      mockDocumentChunk({
        event_id: '$chunk-2',
        content: {
          sequenceNumber: 2,
          data: 'cGxl', // ple
        },
      }),
    ];

    expect(Base64.fromUint8Array(combineChunks(chunks)!)).toEqual(
      'RXhhbXBsZQ==', // Example
    );
  });

  it('should handle out-of-order chunk events', () => {
    const chunks = [
      mockDocumentChunk({
        event_id: '$chunk-1',
        content: {
          sequenceNumber: 1,
          data: 'YW0=', // am
        },
      }),
      mockDocumentChunk({
        event_id: '$chunk-0',
        content: {
          sequenceNumber: 0,
          data: 'RXg=', // Ex
        },
      }),
      mockDocumentChunk({
        event_id: '$chunk-2',
        content: {
          sequenceNumber: 2,
          data: 'cGxl', // ple
        },
      }),
    ];

    expect(Base64.fromUint8Array(combineChunks(chunks)!)).toEqual(
      'RXhhbXBsZQ==', // Example
    );
  });

  it('should handle chunk events that contains no base64', () => {
    // this uses Buffer.from in node.js environments and atob in tests.
    // atob will throw if the base64 is invalid, Buffer.from will accept it.
    // we manually inject an error here to be able to test it
    jest.spyOn(Base64, 'toUint8Array').mockImplementation(() => {
      throw new Error('The string to be decoded is not correctly encoded.');
    });

    const chunks = [
      mockDocumentChunk({
        event_id: '$chunk-0',
        content: {
          sequenceNumber: 0,
          data: 'no-base64',
        },
      }),
    ];

    expect(combineChunks(chunks)).toBeUndefined();
  });
});
