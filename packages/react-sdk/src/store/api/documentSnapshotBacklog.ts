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

import { compareOriginServerTS, RoomEvent } from '@matrix-widget-toolkit/api';
import { Base64 } from 'js-base64';
import { getLogger } from 'loglevel';
import { DocumentChunk, DocumentSnapshot } from '../../model';

export type DocumentSnapshotValidator = (data: Uint8Array) => boolean;

/** A collection that manages yet incomplete document snapshots and chunks. */
export class DocumentSnapshotBacklog {
  snapshots: RoomEvent<DocumentSnapshot>[] = [];
  chunks: RoomEvent<DocumentChunk>[] = [];

  constructor(
    private documentId: string,
    private originServerTs?: number,
    private validator: DocumentSnapshotValidator = () => true,
  ) {}

  /**
   * Register a new snapshot to be processed by the backlog.
   *
   * @param event - the document snapshot
   */
  registerSnapshot(event: RoomEvent<DocumentSnapshot>) {
    if (
      // skip events for other documents
      event.content['m.relates_to'].event_id === this.documentId &&
      // skip events that are too old
      (this.originServerTs === undefined ||
        event.origin_server_ts > this.originServerTs)
    ) {
      this.snapshots.push(event);

      this.snapshots.sort(compareOriginServerTS);
      this.snapshots.reverse();
    }
  }

  /**
   * Register a new chunk to be processed by the backlog.
   *
   * @param event
   */
  registerChunk(event: RoomEvent<DocumentChunk>) {
    if (
      // skip events for other documents
      event.content.documentId === this.documentId &&
      // skip events that are too old
      (this.originServerTs === undefined ||
        event.origin_server_ts > this.originServerTs) &&
      // skip chunk sequences we already know
      !this.chunks.some(
        (c) =>
          c.content['m.relates_to'].event_id ===
            event.content['m.relates_to'].event_id &&
          c.content.sequenceNumber === event.content.sequenceNumber,
      )
    ) {
      this.chunks.push(event);
      this.chunks.sort(
        (a, b) => a.content.sequenceNumber - b.content.sequenceNumber,
      );
    }
  }

  /**
   * Find the most recent complete snapshot if present.
   *
   * @returns - the completed snapshot or undefined.
   */
  findCompleteSnapshot():
    | undefined
    | {
        snapshot: RoomEvent<DocumentSnapshot>;
        chunks: RoomEvent<DocumentChunk>[];
        data: string;
      } {
    // check if we have completed a snapshot
    for (const snapshot of this.snapshots) {
      if (this.chunks.length < snapshot.content.chunkCount) {
        continue;
      }

      const chunks = this.chunks.filter(
        (c) => c.content['m.relates_to'].event_id === snapshot.event_id,
      );

      if (snapshot.content.chunkCount === chunks.length) {
        const data = combineChunks(chunks);

        if (data && this.validator(data)) {
          this.vacuum(snapshot.origin_server_ts, snapshot.event_id);
          return { snapshot, chunks, data: Base64.fromUint8Array(data) };
        }
      }
    }

    return undefined;
  }

  /**
   * Cleanup the backlog and discard entries which are:
   *   (a) older than {@code originServerTs}
   *   (b) relate to a selected {@code relatedEventId}
   *
   * @param originServerTs - the timestamp
   * @param relatedEventId - the event id that events relate to
   */
  private vacuum(originServerTs: number, relatedEventId: string) {
    this.originServerTs = originServerTs;

    this.snapshots = this.snapshots.filter(
      (s) =>
        s.origin_server_ts > originServerTs && s.event_id !== relatedEventId,
    );

    this.chunks = this.chunks.filter(
      (c) =>
        c.origin_server_ts > originServerTs &&
        c.content['m.relates_to'].event_id !== relatedEventId,
    );
  }
}

export function combineChunks(
  chunks: RoomEvent<DocumentChunk>[],
): Uint8Array | undefined {
  try {
    const sortedChunks = chunks
      .slice()
      .sort((a, b) => a.content.sequenceNumber - b.content.sequenceNumber);

    const data = sortedChunks.map((c) => Base64.toUint8Array(c.content.data));

    const array = new Uint8Array(data.reduce((n, d) => n + d.length, 0));

    let offset = 0;

    data.forEach((d) => {
      array.set(d, offset);
      offset += d.length;
    });

    return array;
  } catch (ex) {
    const logger = getLogger('DocumentSnapshotBacklog');
    logger.error('Error while parsing the chunks remote document', ex);
    return undefined;
  }
}
