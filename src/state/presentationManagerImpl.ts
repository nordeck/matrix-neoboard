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

import { isEqual } from 'lodash';
import {
  BehaviorSubject,
  combineLatest,
  concat,
  defer,
  distinctUntilChanged,
  filter,
  map,
  Observable,
  of,
  Subject,
  Subscription,
  takeUntil,
  takeWhile,
} from 'rxjs';
import { isDefined } from '../lib';
import {
  CommunicationChannel,
  isValidPresentSlideMessage,
  PRESENT_SLIDE_MESSAGE,
  PresentSlide,
} from './communication';
import { isPeerConnected } from './communication/connection';
import {
  PresentationManager,
  PresentationState,
  WhiteboardInstance,
} from './types';

export class PresentationManagerImpl implements PresentationManager {
  private readonly destroySubject = new Subject<void>();

  private currentPresenterSessionId: string | undefined;
  private currentPresenterSessionIdSubject = new BehaviorSubject<
    string | undefined
  >(undefined);

  private activeSlidePublisher: Subscription | undefined;

  private isEditMode: boolean = false;
  private isEditModeSubject = new BehaviorSubject(false);

  constructor(
    private readonly whiteboardInstance: WhiteboardInstance,
    private readonly communicationChannel: CommunicationChannel,
    enableObserveVisibilityStateSubject?: Subject<boolean>
  ) {
    this.communicationChannel
      .observeStatistics()
      .pipe(
        filter(
          (statistics) =>
            this.currentPresenterSessionId !== undefined &&
            this.currentPresenterSessionId === statistics.localSessionId
        ),
        map((statistics) =>
          Object.values(statistics.peerConnections)
            .filter(isPeerConnected)
            .map((peer) => peer.remoteSessionId)
        ),
        distinctUntilChanged((a, b) => isEqual(a, b))
      )
      .subscribe(() => {
        // broadcast the current presentation state to also update users
        // who join the presentation later
        const activeSlideId = this.whiteboardInstance.getActiveSlideId();

        if (activeSlideId) {
          this.communicationChannel.broadcastMessage<PresentSlide>(
            PRESENT_SLIDE_MESSAGE,
            { view: { isEditMode: this.isEditMode, slideId: activeSlideId } }
          );
        }
      });

    this.communicationChannel
      .observeMessages()
      .pipe(takeUntil(this.destroySubject), filter(isValidPresentSlideMessage))
      .subscribe(({ senderSessionId, content }) => {
        if (content.view) {
          this.setCurrentPresenter(senderSessionId);

          // clear the undo manager unless the user is already in edit mode
          if (!this.isEditMode && content.view.isEditMode) {
            whiteboardInstance.clearUndoManager();
          }

          this.setEditMode(content.view.isEditMode);
          whiteboardInstance.setActiveSlideId(content.view.slideId);
        } else {
          this.setCurrentPresenter(undefined);
          this.setEditMode(false);
        }
      });

    // don't allow the widget to disconnect even if it is hidden
    if (enableObserveVisibilityStateSubject) {
      this.observePresentationState()
        .pipe(map(({ type }) => type !== 'presenting'))
        .subscribe((enabled) => {
          enableObserveVisibilityStateSubject.next(enabled);
        });
    }
  }

  startPresentation(): void {
    const localSessionId =
      this.communicationChannel.getStatistics().localSessionId;

    if (!localSessionId) {
      return;
    }

    this.setCurrentPresenter(localSessionId);

    this.activeSlidePublisher?.unsubscribe();
    this.activeSlidePublisher = this.whiteboardInstance
      .observeActiveSlideId()
      .pipe(
        filter(isDefined),
        takeWhile(
          () =>
            this.currentPresenterSessionId !== undefined &&
            this.currentPresenterSessionId ===
              this.communicationChannel.getStatistics().localSessionId
        )
      )
      .subscribe((slideId) => {
        this.setEditMode(false);

        this.communicationChannel.broadcastMessage<PresentSlide>(
          PRESENT_SLIDE_MESSAGE,
          { view: { isEditMode: false, slideId } }
        );
      });
  }

  stopPresentation(): void {
    this.setCurrentPresenter(undefined);
    this.setEditMode(false);

    this.communicationChannel.broadcastMessage<PresentSlide>(
      PRESENT_SLIDE_MESSAGE,
      { view: undefined }
    );
    this.activeSlidePublisher?.unsubscribe();
  }

  observePresentationState(): Observable<PresentationState> {
    return combineLatest([
      concat(
        defer(() => of(this.communicationChannel.getStatistics())),
        this.communicationChannel.observeStatistics()
      ),
      this.currentPresenterSessionIdSubject,
      this.isEditModeSubject,
    ]).pipe(
      takeUntil(this.destroySubject),
      map(([statistics, presenterSessionId, isEditMode]): PresentationState => {
        const presenterSession = presenterSessionId
          ? Object.values(statistics.peerConnections).find(
              (c) => c.remoteSessionId === presenterSessionId
            )
          : undefined;

        if (
          presenterSessionId &&
          presenterSessionId === statistics.localSessionId
        ) {
          return { type: 'presenting', isEditMode };
        }

        if (presenterSession && isPeerConnected(presenterSession)) {
          return {
            type: 'presentation',
            presenterUserId: presenterSession.remoteUserId,
            isEditMode,
          };
        }

        return { type: 'idle' };
      }),
      distinctUntilChanged(isEqual)
    );
  }

  toggleEditMode(): void {
    const isEditMode = !this.isEditMode;
    const slideId = this.whiteboardInstance.getActiveSlideId();

    this.setEditMode(isEditMode);

    if (slideId) {
      this.communicationChannel.broadcastMessage<PresentSlide>(
        PRESENT_SLIDE_MESSAGE,
        { view: { isEditMode, slideId } }
      );
    }
  }

  destroy() {
    this.destroySubject.next();
    this.activeSlidePublisher?.unsubscribe();
    this.activeSlidePublisher = undefined;
    this.currentPresenterSessionId = undefined;
    this.isEditMode = false;
  }

  private setCurrentPresenter(presenterSessionId: string | undefined) {
    this.currentPresenterSessionId = presenterSessionId;
    this.currentPresenterSessionIdSubject.next(presenterSessionId);
  }

  private setEditMode(isEditMode: boolean) {
    this.isEditMode = isEditMode;
    this.isEditModeSubject.next(isEditMode);
  }
}
