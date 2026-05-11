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
import { isDefined, isInfiniteCanvasMode, isMatrixRtcMode } from '../lib';
import { isNotExpired } from '../model';
import {
  CommunicationChannel,
  isValidPresentFrameMessage,
  isValidPresentSlideMessage,
  PRESENT_FRAME_MESSAGE,
  PRESENT_SLIDE_MESSAGE,
  PresentFrame,
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
    enableObserveVisibilityStateSubject?: Subject<boolean>,
  ) {
    this.communicationChannel
      .observeStatistics()
      .pipe(
        filter(
          (statistics) =>
            this.currentPresenterSessionId !== undefined &&
            this.currentPresenterSessionId === statistics.localSessionId,
        ),
        map((statistics) => {
          if (isMatrixRtcMode()) {
            return (
              statistics.sessions
                ?.filter(
                  (session) =>
                    session.sessionId !== statistics.localSessionId &&
                    isNotExpired(session),
                )
                .map((session) => session.sessionId) ?? []
            );
          } else {
            return Object.values(statistics.peerConnections)
              .filter(isPeerConnected)
              .map((peer) => peer.remoteSessionId);
          }
        }),
        distinctUntilChanged(isEqual),
        filter((v) => v.length > 0), // skip when no one to send to
      )
      .subscribe(() => {
        // broadcast the current presentation state to also update users
        // who join the presentation later
        if (isInfiniteCanvasMode()) {
          const activeFrameId =
            this.whiteboardInstance.getActiveFrameElementId();

          if (activeFrameId) {
            this.communicationChannel.broadcastMessage<PresentFrame>(
              PRESENT_FRAME_MESSAGE,
              {
                view: {
                  isEditMode: this.isEditMode,
                  frameId: activeFrameId,
                },
              },
            );
          }
        } else {
          const activeSlideId = this.whiteboardInstance.getActiveSlideId();

          if (activeSlideId) {
            this.communicationChannel.broadcastMessage<PresentSlide>(
              PRESENT_SLIDE_MESSAGE,
              {
                view: {
                  isEditMode: this.isEditMode,
                  slideId: activeSlideId,
                },
              },
            );
          }
        }
      });

    this.communicationChannel
      .observeMessages()
      .pipe(takeUntil(this.destroySubject))
      .subscribe((message) => {
        if (isInfiniteCanvasMode()) {
          if (isValidPresentFrameMessage(message)) {
            const { senderSessionId, content } = message;

            if (content.view) {
              this.setCurrentPresenter(senderSessionId);

              // clear the undo manager unless the user is already in edit mode
              if (!this.isEditMode && content.view.isEditMode) {
                whiteboardInstance.clearUndoManager();
              }

              this.setEditMode(content.view.isEditMode);
              const frameId = content.view.frameId;
              whiteboardInstance.setActiveFrameElementId(frameId);
            } else {
              this.setCurrentPresenter(undefined);
              this.setEditMode(false);
              whiteboardInstance.setActiveFrameElementId(undefined);
            }
          }
        } else if (isValidPresentSlideMessage(message)) {
          const { senderSessionId, content } = message;

          if (content.view) {
            this.setCurrentPresenter(senderSessionId);

            // clear the undo manager unless the user is already in edit mode
            if (!this.isEditMode && content.view.isEditMode) {
              whiteboardInstance.clearUndoManager();
            }

            this.setEditMode(content.view.isEditMode);
            const slideId = content.view.slideId;
            whiteboardInstance.setActiveSlideId(slideId);
          } else {
            this.setCurrentPresenter(undefined);
            this.setEditMode(false);
          }
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

  startPresentation(frameElementId?: string): void {
    const localSessionId =
      this.communicationChannel.getStatistics().localSessionId;

    if (!localSessionId) {
      return;
    }

    this.setCurrentPresenter(localSessionId);

    if (frameElementId) {
      this.whiteboardInstance.setActiveFrameElementId(frameElementId);
    }

    this.activeSlidePublisher?.unsubscribe();

    const observable: Observable<string | undefined> = isInfiniteCanvasMode()
      ? this.whiteboardInstance.observeActiveFrameElementId()
      : this.whiteboardInstance.observeActiveSlideId();

    this.activeSlidePublisher = observable
      .pipe(
        filter(isDefined),
        takeWhile(
          () =>
            this.currentPresenterSessionId !== undefined &&
            this.currentPresenterSessionId ===
              this.communicationChannel.getStatistics().localSessionId,
        ),
      )
      .subscribe((slideOrFrameId) => {
        this.setEditMode(false);

        if (isInfiniteCanvasMode()) {
          this.communicationChannel.broadcastMessage<PresentFrame>(
            PRESENT_FRAME_MESSAGE,
            { view: { isEditMode: false, frameId: slideOrFrameId } },
          );
        } else {
          this.communicationChannel.broadcastMessage<PresentSlide>(
            PRESENT_SLIDE_MESSAGE,
            { view: { isEditMode: false, slideId: slideOrFrameId } },
          );
        }
      });
  }

  stopPresentation(): void {
    this.setCurrentPresenter(undefined);
    this.setEditMode(false);

    if (isInfiniteCanvasMode()) {
      this.whiteboardInstance.setActiveFrameElementId(undefined);

      this.communicationChannel.broadcastMessage<PresentFrame>(
        PRESENT_FRAME_MESSAGE,
        { view: undefined },
      );
    } else {
      this.communicationChannel.broadcastMessage<PresentSlide>(
        PRESENT_SLIDE_MESSAGE,
        { view: undefined },
      );
    }
    this.activeSlidePublisher?.unsubscribe();
  }

  observePresentationState(): Observable<PresentationState> {
    return combineLatest([
      concat(
        defer(() => of(this.communicationChannel.getStatistics())),
        this.communicationChannel.observeStatistics(),
      ),
      this.currentPresenterSessionIdSubject,
      this.isEditModeSubject,
    ]).pipe(
      takeUntil(this.destroySubject),
      map(([statistics, presenterSessionId, isEditMode]): PresentationState => {
        if (
          presenterSessionId &&
          presenterSessionId === statistics.localSessionId
        ) {
          return { type: 'presenting', isEditMode };
        }

        let presenterUserId: string | undefined = undefined;
        if (isMatrixRtcMode()) {
          const presenterSession = statistics.sessions?.find(
            (session) =>
              session.sessionId === presenterSessionId && isNotExpired(session),
          );

          if (presenterSession) {
            presenterUserId = presenterSession.userId;
          }
        } else {
          const peerConnection = presenterSessionId
            ? Object.values(statistics.peerConnections).find(
                (c) => c.remoteSessionId === presenterSessionId,
              )
            : undefined;

          if (peerConnection && isPeerConnected(peerConnection)) {
            presenterUserId = peerConnection.remoteUserId;
          }
        }

        if (presenterUserId) {
          return {
            type: 'presentation',
            presenterUserId,
            isEditMode,
          };
        }

        return { type: 'idle' };
      }),
      distinctUntilChanged(isEqual),
    );
  }

  toggleEditMode(): void {
    const isEditMode = !this.isEditMode;
    const slideOrFrameId = isInfiniteCanvasMode()
      ? this.whiteboardInstance.getActiveFrameElementId()
      : this.whiteboardInstance.getActiveSlideId();

    this.setEditMode(isEditMode);

    if (slideOrFrameId) {
      if (isInfiniteCanvasMode()) {
        this.communicationChannel.broadcastMessage<PresentFrame>(
          PRESENT_FRAME_MESSAGE,
          { view: { isEditMode, frameId: slideOrFrameId } },
        );
      } else {
        this.communicationChannel.broadcastMessage<PresentSlide>(
          PRESENT_SLIDE_MESSAGE,
          { view: { isEditMode, slideId: slideOrFrameId } },
        );
      }
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
