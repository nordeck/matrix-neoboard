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

import { Base64 } from 'js-base64';
import { clone } from 'lodash';
import { getLogger } from 'loglevel';
import {
  BehaviorSubject,
  combineLatest,
  concat,
  concatMap,
  distinctUntilChanged,
  filter,
  from,
  map,
  Observable,
  Subject,
  takeUntil,
  tap,
  throttle,
  throttleTime,
} from 'rxjs';
import { isDefined } from '../lib';
import {
  documentSnapshotApi,
  setSnapshotLoadFailed,
  setSnapshotLoadSuccessful,
  setSnapshotSaveFailed,
  setSnapshotSaveSuccessful,
  StoreType,
} from '../store';
import { DocumentSnapshotValidator } from '../store/api/documentSnapshotBacklog';
import {
  CommunicationChannel,
  DOCUMENT_UPDATE_MESSAGE,
  DocumentUpdate,
  isValidDocumentUpdateMessage,
} from './communication';
import { Document, DocumentValidator } from './crdt';
import { DocumentStorage } from './storage';
import { DocumentSyncStatistics, SynchronizedDocument } from './types';

export class SynchronizedDocumentImpl<T extends Record<string, unknown>>
  implements SynchronizedDocument<T>
{
  private readonly logger = getLogger('SynchronizedDocument');
  private readonly loadingSubject = new BehaviorSubject<boolean>(true);
  private readonly destroySubject = new Subject<void>();
  private readonly statisticsSubject = new Subject<DocumentSyncStatistics>();
  private readonly statistics: DocumentSyncStatistics = {
    documentSizeInBytes: 0,
    contentSizeInBytes: 0,
    snapshotOutstanding: false,
    snapshotsReceived: 0,
    snapshotsSend: 0,
  };

  constructor(
    private readonly document: Document<T>,
    private readonly store: StoreType,
    communicationChannel: CommunicationChannel,
    storage: DocumentStorage,
    private documentId: string,
    validation?: {
      snapshotValidator: DocumentSnapshotValidator;
      documentValidator: DocumentValidator<T>;
    },
    private roomId?: string,
  ) {
    communicationChannel
      .observeMessages()
      .pipe(
        takeUntil(this.destroySubject),
        filter(isValidDocumentUpdateMessage),
      )
      .subscribe((message) => {
        if (message.content.documentId === documentId) {
          this.document.applyChange(
            Base64.toUint8Array(message.content.data),
            validation?.documentValidator,
          );
        }
      });

    this.document
      .observePublish()
      .pipe(takeUntil(this.destroySubject))
      .subscribe((change) => {
        communicationChannel.broadcastMessage<DocumentUpdate>(
          DOCUMENT_UPDATE_MESSAGE,
          {
            documentId,
            data: Base64.fromUint8Array(change),
          },
        );
      });

    const storageObservable = from(storage.load(documentId)).pipe(
      filter(isDefined),
      filter((data) => !validation || validation.snapshotValidator(data)),
    );
    const snapshotsObservable = this.observeSnapshots(
      documentId,
      validation?.snapshotValidator,
    ).pipe(
      tap(() => {
        this.statistics.snapshotsReceived += 1;
        this.notifyStatistics();
      }),
      map((snapshotData) => Base64.toUint8Array(snapshotData)),
    );

    concat(storageObservable, snapshotsObservable)
      .pipe(takeUntil(this.destroySubject))
      .subscribe((data) => {
        try {
          document.mergeFrom(data);
        } catch (ex) {
          this.logger.error('Error while merging remote document', ex);
        }
      });

    this.document
      .observeChanges()
      .pipe(
        takeUntil(this.destroySubject),
        concatMap(() => storage.store(documentId, document.store())),
      )
      .subscribe();

    combineLatest({
      loading: this.observeIsLoading().pipe(filter((loading) => !loading)),
      doc: this.document.observePersist().pipe(
        tap(() => {
          this.statistics.snapshotOutstanding = true;
          this.notifyStatistics();
        }),
      ),
    })
      .pipe(
        takeUntil(this.destroySubject),
        // TODO: consider a different/random throttle interval to avoid two users storing at the same time
        throttleTime(5000, undefined, { leading: false, trailing: true }),
        // deduplicate the requests in case the snapshot creation is slower than 5000ms
        throttle(
          async ({ doc }) => {
            try {
              await this.persistDocument(doc);
              this.store.dispatch(setSnapshotSaveSuccessful());
            } catch (e) {
              this.logger.error('Could not store snapshot for', documentId, e);
              this.store.dispatch(setSnapshotSaveFailed());
            }
          },
          { leading: true, trailing: true },
        ),
      )
      .subscribe();

    this.document
      .observeStatistics()
      .pipe(takeUntil(this.destroySubject))
      .subscribe((documentStatistics) => {
        this.statistics.documentSizeInBytes =
          documentStatistics.documentSizeInBytes;
        this.statistics.contentSizeInBytes =
          documentStatistics.contentSizeInBytes;
        this.notifyStatistics();
      });
  }

  getDocument() {
    return this.document;
  }

  destroy() {
    this.destroySubject.next();
    this.statisticsSubject.complete();
    this.loadingSubject.complete();
  }

  observeDocumentStatistics(): Observable<DocumentSyncStatistics> {
    return this.statisticsSubject;
  }

  observeIsLoading(): Observable<boolean> {
    return this.loadingSubject.pipe(distinctUntilChanged());
  }

  private async persistDocument(doc: Document<T>) {
    if (!this.statistics.snapshotOutstanding) {
      // No outstanding snapshot, do nothing
      return;
    }

    this.statistics.snapshotsSend += 1;
    this.statistics.snapshotOutstanding = false;
    this.notifyStatistics();

    try {
      await this.createDocumentSnapshot(this.documentId, doc.store());
    } catch (error) {
      // Snapshot failed, so there is still one outstanding
      this.statistics.snapshotOutstanding = true;
      this.notifyStatistics();
      throw error;
    }
  }

  async persist() {
    await this.persistDocument(this.document);
  }

  private async createDocumentSnapshot(
    documentId: string,
    data: Uint8Array,
  ): Promise<void> {
    await this.store
      .dispatch(
        documentSnapshotApi.endpoints.createDocumentSnapshot.initiate({
          documentId,
          data,
        }),
      )
      .unwrap();
  }

  private observeSnapshots(
    documentId: string,
    validator?: DocumentSnapshotValidator,
  ) {
    const roomId = this.roomId;

    return new Observable<string>((observer) => {
      const unsubscribe = this.store.subscribe(() => {
        const state = this.store.getState();

        const result = documentSnapshotApi.endpoints.getDocumentSnapshot.select(
          {
            documentId,
            validator,
            roomId,
          },
        )(state);

        if (!result.isLoading) {
          const snapshotLoadFailed =
            state.connectionInfoReducer.snapshotLoadFailed;

          if (
            result.isError &&
            result.error.name == 'LoadFailed' &&
            result.error.message &&
            result.error.message.startsWith('Could not load the document')
          ) {
            if (!snapshotLoadFailed) {
              this.store.dispatch(setSnapshotLoadFailed());
            }
          } else {
            const snapshotData = result.data;

            if (snapshotData) {
              observer.next(snapshotData.data);
            }
            this.loadingSubject.next(false);
            if (snapshotLoadFailed !== false) {
              this.store.dispatch(setSnapshotLoadSuccessful());
            }
          }
        }
      });

      const storeSubscription = this.store.dispatch(
        documentSnapshotApi.endpoints.getDocumentSnapshot.initiate({
          documentId,
          validator,
          roomId,
        }),
      );

      return () => {
        unsubscribe();
        storeSubscription.unsubscribe();
      };
    }).pipe(distinctUntilChanged());
  }

  private notifyStatistics() {
    this.statisticsSubject.next(clone(this.statistics));
  }
}
