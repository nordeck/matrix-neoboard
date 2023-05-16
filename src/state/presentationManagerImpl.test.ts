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

import { BehaviorSubject, firstValueFrom, Subject, take, toArray } from 'rxjs';
import { mockPeerConnectionStatistics } from '../lib/testUtils/documentTestUtils';
import {
  CommunicationChannel,
  CommunicationChannelStatistics,
  Message,
} from './communication';
import { PresentationManagerImpl } from './presentationManagerImpl';
import { WhiteboardInstance } from './types';

describe('presentationManager', () => {
  let communicationStatistics: CommunicationChannelStatistics;
  let observeCommunicationStatisticsSubject: Subject<CommunicationChannelStatistics>;
  let observeActiveSlideIdSubject: BehaviorSubject<string | undefined>;
  let communicationChannel: jest.Mocked<CommunicationChannel>;
  let messageSubject: Subject<Message>;
  let whiteboardInstance: jest.Mocked<WhiteboardInstance>;
  let enableObserveVisibilityStateSubject: Subject<boolean>;
  let presentationManager: PresentationManagerImpl;

  beforeEach(async () => {
    communicationStatistics = {
      localSessionId: 'own',
      peerConnections: {
        'peer-0': mockPeerConnectionStatistics(
          '@user-bob',
          'connected',
          'session-0'
        ),
        'peer-1': mockPeerConnectionStatistics(
          '@user-charlie',
          'failed',
          'session-1'
        ),
      },
    };
    observeCommunicationStatisticsSubject =
      new Subject<CommunicationChannelStatistics>();
    messageSubject = new Subject<Message>();
    observeActiveSlideIdSubject = new BehaviorSubject<string | undefined>(
      'slide-0'
    );

    communicationChannel = {
      broadcastMessage: jest.fn(),
      observeMessages: jest.fn().mockReturnValue(messageSubject),
      getStatistics: jest
        .fn()
        .mockImplementation(() => communicationStatistics),
      observeStatistics: jest
        .fn()
        .mockReturnValue(observeCommunicationStatisticsSubject),
      destroy: jest.fn(),
    };

    whiteboardInstance = {
      addSlide: jest.fn(),
      export: jest.fn(),
      focusOn: jest.fn(),
      getActiveSlideId: jest
        .fn()
        .mockImplementation(() => observeActiveSlideIdSubject.value),
      getPresentationManager: jest.fn(),
      getSlide: jest.fn(),
      getSlideIds: jest.fn(),
      getWhiteboardId: jest.fn(),
      getWhiteboardStatistics: jest.fn(),
      import: jest.fn(),
      isLoading: jest.fn(),
      moveSlide: jest.fn(),
      observeActiveSlideId: jest
        .fn()
        .mockReturnValue(observeActiveSlideIdSubject),
      observeIsLoading: jest.fn(),
      observeSlideIds: jest.fn(),
      observeUndoRedoState: jest.fn(),
      observeWhiteboardStatistics: jest.fn(),
      redo: jest.fn(),
      removeSlide: jest.fn(),
      setActiveSlideId: jest.fn(),
      undo: jest.fn(),
    };

    enableObserveVisibilityStateSubject = new Subject<boolean>();
    presentationManager = new PresentationManagerImpl(
      whiteboardInstance,
      communicationChannel,
      enableObserveVisibilityStateSubject
    );
  });

  it('should start the presentation', async () => {
    const states = firstValueFrom(
      presentationManager.observePresentationState().pipe(take(2), toArray())
    );

    presentationManager.startPresentation();

    expect(await states).toEqual([{ type: 'idle' }, { type: 'presenting' }]);
    expect(communicationChannel.broadcastMessage).toBeCalledWith(
      'net.nordeck.whiteboard.present_slide',
      { view: { slideId: 'slide-0' } }
    );
    expect(whiteboardInstance.setActiveSlideId).not.toBeCalled();
  });

  it('should stop the presentation', async () => {
    presentationManager.startPresentation();

    const states = firstValueFrom(
      presentationManager.observePresentationState().pipe(take(2), toArray())
    );

    presentationManager.stopPresentation();

    expect(await states).toEqual([{ type: 'presenting' }, { type: 'idle' }]);
    expect(communicationChannel.broadcastMessage).toBeCalledWith(
      'net.nordeck.whiteboard.present_slide',
      { view: undefined }
    );
    expect(whiteboardInstance.setActiveSlideId).not.toBeCalled();
  });

  it('should accept presentation start of a different user', async () => {
    const states = firstValueFrom(
      presentationManager.observePresentationState().pipe(take(2), toArray())
    );

    messageSubject.next({
      senderUserId: '@user-bob',
      senderSessionId: 'session-0',
      type: 'net.nordeck.whiteboard.present_slide',
      content: {
        view: { slideId: 'slide-0' },
      },
    });

    expect(await states).toEqual([
      { type: 'idle' },
      { type: 'presentation', presenterUserId: '@user-bob' },
    ]);
    expect(whiteboardInstance.setActiveSlideId).toBeCalledWith('slide-0');
  });

  it('should accept presentation stop of a different user', async () => {
    messageSubject.next({
      senderUserId: '@user-bob',
      senderSessionId: 'session-0',
      type: 'net.nordeck.whiteboard.present_slide',
      content: {
        view: { slideId: 'slide-0' },
      },
    });

    whiteboardInstance.setActiveSlideId.mockReset();

    const states = firstValueFrom(
      presentationManager.observePresentationState().pipe(take(2), toArray())
    );

    messageSubject.next({
      senderUserId: '@user-bob',
      senderSessionId: 'session-0',
      type: 'net.nordeck.whiteboard.present_slide',
      content: { view: undefined },
    });

    expect(await states).toEqual([
      { type: 'presentation', presenterUserId: '@user-bob' },
      { type: 'idle' },
    ]);
    expect(whiteboardInstance.setActiveSlideId).not.toBeCalled();
  });

  it('should update the presentation state when a presenting user becomes disconnected', async () => {
    messageSubject.next({
      senderUserId: '@user-bob',
      senderSessionId: 'session-0',
      type: 'net.nordeck.whiteboard.present_slide',
      content: {
        view: { slideId: 'slide-0' },
      },
    });

    whiteboardInstance.setActiveSlideId.mockReset();

    const states = firstValueFrom(
      presentationManager.observePresentationState().pipe(take(2), toArray())
    );

    communicationStatistics = {
      localSessionId: 'own',
      peerConnections: {
        'peer-0': mockPeerConnectionStatistics(
          '@user-bob',
          'failed',
          'session-0'
        ),
      },
    };
    observeCommunicationStatisticsSubject.next(communicationStatistics);

    expect(await states).toEqual([
      { type: 'presentation', presenterUserId: '@user-bob' },
      { type: 'idle' },
    ]);
    expect(whiteboardInstance.setActiveSlideId).not.toBeCalled();
  });

  it('should broadcast the active slide when it changes', async () => {
    presentationManager.startPresentation();
    observeActiveSlideIdSubject.next('slide-1');
    observeActiveSlideIdSubject.next('slide-2');

    expect(communicationChannel.broadcastMessage).toBeCalledTimes(3);

    expect(communicationChannel.broadcastMessage).toHaveBeenNthCalledWith(
      1,
      'net.nordeck.whiteboard.present_slide',
      { view: { slideId: 'slide-0' } }
    );
    expect(communicationChannel.broadcastMessage).toHaveBeenNthCalledWith(
      2,
      'net.nordeck.whiteboard.present_slide',
      { view: { slideId: 'slide-1' } }
    );
    expect(communicationChannel.broadcastMessage).toHaveBeenNthCalledWith(
      3,
      'net.nordeck.whiteboard.present_slide',
      { view: { slideId: 'slide-2' } }
    );
  });

  it('should broadcast the active slide when a new session is connected', async () => {
    presentationManager.startPresentation();

    communicationStatistics = {
      localSessionId: 'own',
      peerConnections: {
        'peer-0': mockPeerConnectionStatistics(
          '@user-bob',
          'connected',
          'session-0'
        ),
        'peer-1': mockPeerConnectionStatistics(
          '@user-charlie',
          'failed',
          'session-1'
        ),
        'peer-2': mockPeerConnectionStatistics(
          '@user-dave',
          'connected',
          'session-3'
        ),
      },
    };
    observeCommunicationStatisticsSubject.next(communicationStatistics);

    expect(communicationChannel.broadcastMessage).toBeCalledTimes(2);

    expect(communicationChannel.broadcastMessage).toBeCalledWith(
      'net.nordeck.whiteboard.present_slide',
      { view: { slideId: 'slide-0' } }
    );
  });

  it('should skip broadcasting the active slide when the presentation was cancelled', async () => {
    presentationManager.startPresentation();
    observeActiveSlideIdSubject.next('slide-1');

    communicationStatistics = {
      localSessionId: 'own-new',
      peerConnections: {},
    };
    observeCommunicationStatisticsSubject.next(communicationStatistics);

    observeActiveSlideIdSubject.next('slide-2');
    expect(communicationChannel.broadcastMessage).toBeCalledTimes(2);

    expect(communicationChannel.broadcastMessage).toHaveBeenNthCalledWith(
      1,
      'net.nordeck.whiteboard.present_slide',
      { view: { slideId: 'slide-0' } }
    );
    expect(communicationChannel.broadcastMessage).toHaveBeenNthCalledWith(
      2,
      'net.nordeck.whiteboard.present_slide',
      { view: { slideId: 'slide-1' } }
    );
  });

  it('should disable the visibility observation when presenting', async () => {
    const visibilityObservations = firstValueFrom(
      enableObserveVisibilityStateSubject.pipe(take(3), toArray())
    );

    presentationManager.startPresentation();
    presentationManager.stopPresentation();

    messageSubject.next({
      senderUserId: '@user-bob',
      senderSessionId: 'session-0',
      type: 'net.nordeck.whiteboard.present_slide',
      content: {
        view: { slideId: 'slide-0' },
      },
    });

    expect(await visibilityObservations).toEqual([false, true, true]);
  });

  it('should close observables on destroy', async () => {
    const states = firstValueFrom(
      presentationManager.observePresentationState().pipe(toArray())
    );

    presentationManager.destroy();

    expect(await states).toEqual([{ type: 'idle' }]);
  });
});
