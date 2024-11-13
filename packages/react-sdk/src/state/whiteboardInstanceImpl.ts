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

import { StateEvent, WidgetApi } from '@matrix-widget-toolkit/api';
import { cloneDeep, debounce, isEqual } from 'lodash';
import {
  BehaviorSubject,
  Observable,
  Subject,
  concat,
  defer,
  distinctUntilChanged,
  filter,
  map,
  of,
  pairwise,
  shareReplay,
  takeUntil,
  tap,
} from 'rxjs';
import { Whiteboard } from '../model';
import { StoreType } from '../store';
import {
  CommunicationChannel,
  FOCUS_ON_MESSAGE,
  FocusOn,
  SessionManager,
  SignalingChannel,
  WebRtcCommunicationChannel,
  isValidFocusOnMessage,
} from './communication';
import {
  WhiteboardDocument,
  createWhiteboardDocument,
  generateAddSlide,
  generateDuplicateSlide,
  generateMoveSlide,
  generateRemoveSlide,
  getNormalizedSlideIds,
  getSlide,
  isValidWhiteboardDocument,
  isValidWhiteboardDocumentSnapshot,
} from './crdt';
import { WhiteboardDocumentExport, exportWhiteboard } from './export';
import { generateLoadWhiteboardFromExport } from './export/loadWhiteboardFromExport';
import { PresentationManagerImpl } from './presentationManagerImpl';
import { LocalForageDocumentStorage } from './storage';
import { SynchronizedDocumentImpl } from './synchronizedDocumentImpl';
import {
  PersistOptions,
  PresentationManager,
  SynchronizedDocument,
  WhiteboardInstance,
  WhiteboardSlideInstance,
  WhiteboardStatistics,
  isWhiteboardUndoManagerContext,
} from './types';
import { WhiteboardSlideInstanceImpl } from './whiteboardSlideInstanceImpl';

export class WhiteboardInstanceImpl implements WhiteboardInstance {
  private readonly destroySubject = new Subject<void>();
  private readonly whiteboardStatisticsSubject =
    new Subject<WhiteboardStatistics>();
  private whiteboardStatistics: WhiteboardStatistics;

  private readonly activeSlideIdSubject = new Subject<string | undefined>();
  private activeSlideId: string | undefined = undefined;
  private loading: boolean = true;
  private loadingSubject = new BehaviorSubject<boolean>(true);

  private presentationManager = new PresentationManagerImpl(
    this,
    this.communicationChannel,
    this.enableObserveVisibilityStateSubject,
  );

  private readonly slides = new Map<string, WhiteboardSlideInstanceImpl>();

  /**
   * Provide current slide IDs.
   */
  private readonly slideIdsObservable = concat(
    defer(() => of(this.synchronizedDocument.getDocument().getData())),
    this.synchronizedDocument.getDocument().observeChanges(),
  ).pipe(
    map(getNormalizedSlideIds),

    distinctUntilChanged<string[]>(isEqual),

    /**
     * Add only missing slides here.
     * Removal of slides is done by removeSlidesAndFixCurrentSlideObservable.
     * Then publish the new slide IDs.
     */
    tap((slideIds) => {
      const toAdd = slideIds.filter((slideId) => !this.slides.has(slideId));
      toAdd.forEach((slideId) => {
        const slideMetadata = getSlide(
          this.synchronizedDocument.getDocument().getData(),
          slideId,
        );

        if (!slideMetadata) {
          throw new Error('Slide not found');
        }

        const slideInstance = new WhiteboardSlideInstanceImpl(
          this.communicationChannel,
          slideId,
          this.synchronizedDocument.getDocument(),
          this.userId,
        );
        this.slides.set(slideId, slideInstance);
      });
    }),

    takeUntil(this.destroySubject),

    shareReplay(1),
  );

  /**
   * Remove deleted slides and set the current active slide.
   */
  private readonly removeSlidesAndFixCurrentSlideObservable = concat(
    defer(() =>
      of(
        this.synchronizedDocument.getDocument().getData(),
        this.synchronizedDocument.getDocument().getData(),
      ),
    ),
    this.synchronizedDocument.getDocument().observeChanges(),
  ).pipe(
    map(getNormalizedSlideIds),

    // get a pair of [previous, new] values
    pairwise(),

    distinctUntilChanged<[string[], string[]]>(isEqual),

    /**
     * Removed dropped slides here and set the active slide.
     */
    tap(([previousSlideIds, slideIds]) => {
      const toRemove = Array.from(this.slides.keys()).filter(
        (slideId) => !slideIds.includes(slideId),
      );

      // bootstrap or repair the active slide id if unset or if
      // the selected slide was removed.
      const newActiveSlideId = findNewActiveSlideId(
        this.activeSlideId,
        slideIds,
        previousSlideIds,
      );
      if (this.activeSlideId !== newActiveSlideId) {
        this.activeSlideId = newActiveSlideId;
        this.activeSlideIdSubject.next(newActiveSlideId);
      }

      toRemove.forEach((slideId) => {
        this.slides.get(slideId)?.destroy();
        this.slides.delete(slideId);
      });
    }),

    takeUntil(this.destroySubject),
  );

  static create(
    store: StoreType,
    widgetApiPromise: Promise<WidgetApi>,
    sessionManager: SessionManager,
    signalingChannel: SignalingChannel,
    whiteboardEvent: StateEvent<Whiteboard>,
    userId: string,
  ): WhiteboardInstanceImpl {
    const enableObserveVisibilityStateSubject = new BehaviorSubject(true);
    const communicationChannel = new WebRtcCommunicationChannel(
      widgetApiPromise,
      sessionManager,
      signalingChannel,
      whiteboardEvent.event_id,
      enableObserveVisibilityStateSubject,
    );
    const storage = new LocalForageDocumentStorage();

    const document = new SynchronizedDocumentImpl(
      createWhiteboardDocument(),
      store,
      communicationChannel,
      storage,
      whiteboardEvent.content.documentId,
      {
        documentValidator: isValidWhiteboardDocument,
        snapshotValidator: isValidWhiteboardDocumentSnapshot,
      },
    );

    return new WhiteboardInstanceImpl(
      document,
      communicationChannel,
      whiteboardEvent,
      userId,
      enableObserveVisibilityStateSubject,
    );
  }

  constructor(
    private readonly synchronizedDocument: SynchronizedDocument<WhiteboardDocument>,
    private readonly communicationChannel: CommunicationChannel,
    private readonly whiteboardEvent: StateEvent<Whiteboard>,
    private readonly userId: string,
    private readonly enableObserveVisibilityStateSubject?: Subject<boolean>,
  ) {
    this.whiteboardStatistics = {
      document: undefined,
      communicationChannel: cloneDeep(
        this.communicationChannel.getStatistics(),
      ),
    };

    this.synchronizedDocument
      .getDocument()
      .getUndoManager()
      .onPop(isWhiteboardUndoManagerContext)
      .pipe(takeUntil(this.destroySubject))
      .subscribe((state) => {
        this.setActiveSlideId(state.currentSlideId);

        if (
          state.currentSlideId === this.activeSlideId &&
          state.currentElementIds
        ) {
          this.getSlide(state.currentSlideId).setActiveElementIds(
            state.currentElementIds,
          );
        }
      });

    this.communicationChannel
      .observeStatistics()
      .pipe(takeUntil(this.destroySubject))
      .subscribe((communicationChannelStatistics) => {
        this.whiteboardStatistics = {
          ...this.whiteboardStatistics,
          communicationChannel: communicationChannelStatistics,
        };

        this.whiteboardStatisticsSubject.next(this.whiteboardStatistics);
      });

    this.communicationChannel
      .observeMessages()
      .pipe(takeUntil(this.destroySubject), filter(isValidFocusOnMessage))
      .subscribe(({ content }) => {
        this.setActiveSlideId(content.slideId);
      });

    this.synchronizedDocument
      .observeDocumentStatistics()
      .pipe(takeUntil(this.destroySubject))
      .subscribe((documentStatistics) => {
        this.whiteboardStatistics = {
          ...this.whiteboardStatistics,
          document: documentStatistics,
        };
        this.whiteboardStatisticsSubject.next(this.whiteboardStatistics);
      });

    this.synchronizedDocument
      .observeIsLoading()
      .pipe(takeUntil(this.destroySubject))
      .subscribe((loading) => {
        this.loading = loading;
        this.loadingSubject.next(loading);

        // Reset the slide after the initial loading finished
        this.activeSlideId = this.getSlideIds()[0];
        this.activeSlideIdSubject.next(this.activeSlideId);
      });

    // ensure that the slide IDs are kept up-to-date
    this.observeSlideIds().pipe(takeUntil(this.destroySubject)).subscribe();
    // subscribe to this one after the the slide IDs observable to remove deleted slides and
    // set the new current slide
    this.removeSlidesAndFixCurrentSlideObservable
      .pipe(takeUntil(this.destroySubject))
      .subscribe();
  }

  addSlide(index?: number): string {
    const [changeFn, slideId] = generateAddSlide();
    this.synchronizedDocument.getDocument().performChange((doc) => {
      changeFn(doc);

      if (index !== undefined) {
        generateMoveSlide(slideId, index)(doc);
      }
    });

    return slideId;
  }

  duplicateSlide(slideId: string): string {
    const [changeFn, newSlideId] = generateDuplicateSlide(slideId);
    this.synchronizedDocument.getDocument().performChange(changeFn);

    return newSlideId;
  }

  moveSlide(slideId: string, index: number) {
    this.synchronizedDocument
      .getDocument()
      .performChange(generateMoveSlide(slideId, index));
  }

  removeSlide(slideId: string) {
    this.synchronizedDocument
      .getDocument()
      .performChange(generateRemoveSlide(slideId));
  }

  focusOn(slideId: string): void {
    this.communicationChannel.broadcastMessage<FocusOn>(FOCUS_ON_MESSAGE, {
      slideId,
    });
  }

  getSlide(slideId: string): WhiteboardSlideInstance {
    const instance = this.slides.get(slideId);

    if (!instance) {
      throw new Error('SlideId does not exist');
    }

    return instance;
  }

  getSlideIds(): string[] {
    return getNormalizedSlideIds(
      this.synchronizedDocument.getDocument().getData(),
    );
  }

  observeSlideIds(): Observable<string[]> {
    return this.slideIdsObservable;
  }

  getWhiteboardStatistics(): WhiteboardStatistics {
    return this.whiteboardStatistics;
  }

  observeWhiteboardStatistics(): Observable<WhiteboardStatistics> {
    return this.whiteboardStatisticsSubject;
  }

  getActiveSlideId(): string | undefined {
    return this.activeSlideId;
  }

  observeActiveSlideId(): Observable<string | undefined> {
    return concat(
      defer(() => of(this.getActiveSlideId())),
      this.activeSlideIdSubject,
    ).pipe(distinctUntilChanged());
  }

  setActiveSlideId(slideId: string): void {
    if (this.getSlideIds().includes(slideId)) {
      this.getSlide(slideId).setActiveElementId(undefined);

      this.activeSlideId = slideId;
      this.activeSlideIdSubject.next(slideId);
    }
  }

  getWhiteboardId(): string {
    return this.whiteboardEvent.event_id;
  }

  isLoading(): boolean {
    return this.loading;
  }

  observeIsLoading(): Observable<boolean> {
    return this.loadingSubject;
  }

  async export(widgetApi: WidgetApi): Promise<WhiteboardDocumentExport> {
    return exportWhiteboard(
      this.synchronizedDocument.getDocument().getData(),
      widgetApi,
    );
  }

  import(
    whiteboardDocumentExport: WhiteboardDocumentExport,
    atSlideIndex?: number,
  ): void {
    this.synchronizedDocument
      .getDocument()
      .performChange(
        generateLoadWhiteboardFromExport(
          whiteboardDocumentExport,
          this.userId,
          atSlideIndex,
        ),
      );
  }

  undo(): void {
    this.synchronizedDocument.getDocument().getUndoManager().undo();
  }

  redo(): void {
    this.synchronizedDocument.getDocument().getUndoManager().redo();
  }

  observeUndoRedoState(): Observable<{ canUndo: boolean; canRedo: boolean }> {
    return this.synchronizedDocument
      .getDocument()
      .getUndoManager()
      .observeState()
      .pipe(distinctUntilChanged(isEqual), takeUntil(this.destroySubject));
  }

  getPresentationManager(): PresentationManager {
    return this.presentationManager;
  }

  destroy() {
    this.slides.forEach((s) => s.destroy());
    this.whiteboardStatisticsSubject.complete();
    this.activeSlideIdSubject.complete();
    this.loadingSubject.complete();
    this.destroySubject.next();
    this.synchronizedDocument.destroy();
    this.presentationManager.destroy();
    this.communicationChannel.destroy();
  }

  async persist(options: PersistOptions): Promise<void> {
    if (options.timestamp !== undefined && options.immediate !== undefined) {
      const snapshot = this.synchronizedDocument.getLatestDocumentSnapshot();
      if (snapshot && snapshot.origin_server_ts < options.timestamp) {
        if (options.immediate) {
          await this.synchronizedDocument.persist(true);
        } else {
          const delay = Math.floor(Math.random() * 20) + 10;
          debounce(
            () => this.synchronizedDocument.persist(true),
            delay * 1000,
          )();
        }
      }
    } else {
      await this.synchronizedDocument.persist(false);
    }
  }

  clearUndoManager(): void {
    this.synchronizedDocument.getDocument().getUndoManager().clear();
  }
}

export function findNewActiveSlideId(
  slideId: string | undefined,
  slideIds: string[],
  previousSlideIds: string[],
): string | undefined {
  // select the first slide if nothing is selected
  if (slideId === undefined) {
    return slideIds[0];
  }

  // select a nearby slide if it is removed
  if (!slideIds.includes(slideId)) {
    const lastIndex = Math.min(
      slideIds.length - 1,
      Math.max(0, previousSlideIds.indexOf(slideId)),
    );
    return slideIds[lastIndex];
  }

  return slideId;
}
