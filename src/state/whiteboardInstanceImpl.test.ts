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

import { firstValueFrom, Subject, take, toArray } from 'rxjs';
import { mockLineElement } from '../lib/testUtils/documentTestUtils';
import { mockWhiteboard } from '../lib/testUtils/matrixTestUtils';
import {
  CommunicationChannel,
  CommunicationChannelStatistics,
  Message,
  PeerConnectionStatistics,
} from './communication';
import {
  createWhiteboardDocument,
  Document,
  DocumentStatistics,
  generateAddSlide,
  generateMoveSlide,
  generateRemoveSlide,
  WhiteboardDocument,
} from './crdt';
import { SynchronizedDocument } from './types';
import {
  findNewActiveSlideId,
  WhiteboardInstanceImpl,
} from './whiteboardInstanceImpl';
import { WhiteboardSlideInstanceImpl } from './whiteboardSlideInstanceImpl';

// createWhiteboardDocument() always contains a slide with this id
const slide0 = 'IN4h74suMiIAK4AVMAdl_';

describe('WhiteboardInstanceImpl', () => {
  let observeCommunicationStatisticsSubject: Subject<CommunicationChannelStatistics>;
  let observeIsLoadingSubject: Subject<boolean>;
  let communicationChannel: jest.Mocked<CommunicationChannel>;
  let messageSubject: Subject<Message>;
  let observeDocumentStatisticsSubject: Subject<DocumentStatistics>;
  let synchronizedDocument: jest.Mocked<
    SynchronizedDocument<WhiteboardDocument>
  >;
  let document: Document<WhiteboardDocument>;

  beforeEach(async () => {
    observeCommunicationStatisticsSubject =
      new Subject<CommunicationChannelStatistics>();
    observeIsLoadingSubject = new Subject<boolean>();
    observeDocumentStatisticsSubject = new Subject<DocumentStatistics>();
    messageSubject = new Subject<Message>();

    communicationChannel = {
      broadcastMessage: jest.fn(),
      observeMessages: jest.fn().mockReturnValue(messageSubject),
      getStatistics: jest
        .fn()
        .mockReturnValue({ localSessionId: 'own', peerConnections: {} }),
      observeStatistics: jest
        .fn()
        .mockReturnValue(observeCommunicationStatisticsSubject),
      destroy: jest.fn(),
    };

    document = createWhiteboardDocument();

    synchronizedDocument = {
      getDocument: jest.fn().mockReturnValue(document),
      destroy: jest.fn(),
      observeDocumentStatistics: jest
        .fn()
        .mockReturnValue(observeDocumentStatisticsSubject),
      observeIsLoading: jest.fn().mockReturnValue(observeIsLoadingSubject),
    };
  });

  it('should create slide instances for all slides', () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    expect(whiteboardInstance.getSlide(slide0)).toBeInstanceOf(
      WhiteboardSlideInstanceImpl
    );
  });

  it('should return the whiteboard id', () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    expect(whiteboardInstance.getWhiteboardId()).toBe('$event-id-0');
  });

  it('should add slide instances for added slides', () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    const [changeFn, slideId] = generateAddSlide();
    document.performChange(changeFn);

    expect(whiteboardInstance.getSlide(slideId)).toBeInstanceOf(
      WhiteboardSlideInstanceImpl
    );
  });

  it('should delete slide instances for removed slides', () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    const destroySlideSpy = jest.spyOn(
      whiteboardInstance.getSlide(slide0) as WhiteboardSlideInstanceImpl,
      'destroy'
    );

    const changeFn = generateRemoveSlide(slide0);
    document.performChange(changeFn);

    expect(destroySlideSpy).toBeCalled();
    expect(() => whiteboardInstance.getSlide(slide0)).toThrowError(
      'SlideId does not exist'
    );
  });

  it('should provide statistics of the communication channel', async () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    expect(whiteboardInstance.getWhiteboardStatistics()).toEqual({
      communicationChannel: { localSessionId: 'own', peerConnections: {} },
    });

    const statistics = firstValueFrom(
      whiteboardInstance.observeWhiteboardStatistics()
    );

    const peerConnectionStatistics: PeerConnectionStatistics = {
      remoteSessionId: 'other',
      remoteUserId: 'user',
      impolite: true,
      bytesReceived: 0,
      bytesSent: 0,
      packetsReceived: 0,
      packetsSent: 0,
      connectionState: 'connected',
      signalingState: 'stable',
      iceConnectionState: 'connected',
      iceGatheringState: 'complete',
    };

    observeCommunicationStatisticsSubject.next({
      localSessionId: 'own',
      peerConnections: { key: peerConnectionStatistics },
    });

    expect(await statistics).toEqual({
      communicationChannel: {
        localSessionId: 'own',
        peerConnections: { key: peerConnectionStatistics },
      },
    });
  });

  it('should provide statistics of the document', async () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    expect(whiteboardInstance.getWhiteboardStatistics()).toEqual({
      communicationChannel: { localSessionId: 'own', peerConnections: {} },
    });

    const statistics = firstValueFrom(
      whiteboardInstance.observeWhiteboardStatistics()
    );

    observeDocumentStatisticsSubject.next({
      contentSizeInBytes: 100,
      documentSizeInBytes: 200,
    });

    expect(await statistics).toEqual({
      communicationChannel: { localSessionId: 'own', peerConnections: {} },
      document: {
        contentSizeInBytes: 100,
        documentSizeInBytes: 200,
      },
    });
  });

  it('should provide loading state of the document', async () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    expect(whiteboardInstance.isLoading()).toBe(true);

    const loading = firstValueFrom(
      whiteboardInstance.observeIsLoading().pipe(take(2), toArray())
    );

    observeIsLoadingSubject.next(false);

    expect(await loading).toEqual([true, false]);
    expect(whiteboardInstance.isLoading()).toBe(false);
  });

  it('should select the first slide of the whiteboard after the document was loaded initially', async () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    // initially, the whiteboard is initiated with the initial slide
    expect(whiteboardInstance.isLoading()).toBe(true);
    expect(whiteboardInstance.getActiveSlideId()).toBe(slide0);

    // create a new document where new slide is added as the first slide
    // this simulates a document that is loaded from the element room
    const remoteDocument = createWhiteboardDocument();
    const [addSlideChangeFn, slide1] = generateAddSlide();
    const moveSlideChangeFn = generateMoveSlide(slide1, 0);
    remoteDocument.performChange((doc) => {
      addSlideChangeFn(doc);
      moveSlideChangeFn(doc);
    });
    synchronizedDocument.getDocument().mergeFrom(remoteDocument.store());

    // notify that the loading was successful
    observeIsLoadingSubject.next(false);

    // now the first slide of the updated document should be selected
    expect(whiteboardInstance.isLoading()).toBe(false);
    expect(whiteboardInstance.getActiveSlideId()).toBe(slide1);
  });

  it('should add a new slide', async () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    const slide1 = whiteboardInstance.addSlide();

    expect(whiteboardInstance.getSlide(slide1)).toBeDefined();
  });

  it('should move a slide', async () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    const slide1 = whiteboardInstance.addSlide();
    const slide2 = whiteboardInstance.addSlide();

    expect(whiteboardInstance.getSlideIds()).toEqual([slide0, slide1, slide2]);

    whiteboardInstance.moveSlide(slide1, 0);

    expect(whiteboardInstance.getSlideIds()).toEqual([slide1, slide0, slide2]);
  });

  it('should remove a slide', async () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    const slide1 = whiteboardInstance.addSlide();
    const slide2 = whiteboardInstance.addSlide();

    expect(whiteboardInstance.getSlideIds()).toEqual([slide0, slide1, slide2]);

    const destroySlideSpy = jest.spyOn(
      whiteboardInstance.getSlide(slide1) as WhiteboardSlideInstanceImpl,
      'destroy'
    );

    whiteboardInstance.removeSlide(slide1);

    expect(destroySlideSpy).toBeCalled();
    expect(whiteboardInstance.getSlideIds()).toEqual([slide0, slide2]);
  });

  it('should focus on slide', () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    whiteboardInstance.focusOn(slide0);

    expect(communicationChannel.broadcastMessage).toBeCalledWith(
      'net.nordeck.whiteboard.focus_on',
      { slideId: slide0 }
    );
  });

  it('should observe focus on messages and focus slide', () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    const slide1 = whiteboardInstance.addSlide();

    messageSubject.next({
      type: 'net.nordeck.whiteboard.focus_on',
      content: { slideId: slide1 },
      senderSessionId: 'session-id',
      senderUserId: '@another-user-id',
    });

    expect(whiteboardInstance.getActiveSlideId()).toBe(slide1);
  });

  it('should throw if slide does not exist', () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    expect(() => whiteboardInstance.getSlide('not-exists')).toThrowError(
      'SlideId does not exist'
    );
  });

  it('should observe all slide ids', async () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    const slideIds = firstValueFrom(
      whiteboardInstance.observeSlideIds().pipe(take(2), toArray())
    );

    const slide1 = whiteboardInstance.addSlide();

    expect(await slideIds).toEqual([[slide0], [slide0, slide1]]);
  });

  it('should select the first slide as active slide', () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    expect(whiteboardInstance.getActiveSlideId()).toEqual(slide0);
  });

  it('should deselect the active slide when removed', async () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    const observedActiveSlides = firstValueFrom(
      whiteboardInstance.observeActiveSlideId().pipe(take(2), toArray())
    );

    const slide1 = whiteboardInstance.addSlide();
    whiteboardInstance.removeSlide(slide0);

    expect(whiteboardInstance.getActiveSlideId()).toEqual(slide1);
    expect(await observedActiveSlides).toEqual([slide0, slide1]);
  });

  it('should switch a specific slide', async () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    const observedActiveSlides = firstValueFrom(
      whiteboardInstance.observeActiveSlideId().pipe(take(2), toArray())
    );

    const slide1 = whiteboardInstance.addSlide();
    whiteboardInstance.setActiveSlideId('not-exists');
    whiteboardInstance.setActiveSlideId(slide1);

    expect(whiteboardInstance.getActiveSlideId()).toEqual(slide1);
    expect(await observedActiveSlides).toEqual([slide0, slide1]);
  });

  it('should reset active element selection when selecting a slide', async () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    const slide1 = whiteboardInstance.addSlide();
    const slideInstance = whiteboardInstance.getSlide(slide1);
    const element0 = slideInstance.addElement(mockLineElement());
    whiteboardInstance.getSlide(slide1).setActiveElementIds([element0]);

    whiteboardInstance.setActiveSlideId(slide1);

    expect(whiteboardInstance.getSlide(slide1).getActiveElementIds()).toEqual(
      []
    );
  });

  it('should undo and redo change', () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    const slideInstance = whiteboardInstance.getSlide(slide0);
    const element0 = slideInstance.addElement(mockLineElement());
    expect(slideInstance.getElementIds()).toEqual([element0]);

    whiteboardInstance.undo();
    expect(slideInstance.getElementIds()).toEqual([]);

    whiteboardInstance.redo();
    expect(slideInstance.getElementIds()).toEqual([element0]);
  });

  it('should undo change and restore the selected slide and element', () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    // prepare a new slide
    const slide1 = whiteboardInstance.addSlide();
    const slide1Instance = whiteboardInstance.getSlide(slide1);
    whiteboardInstance.setActiveSlideId(slide1);
    const element0 = slide1Instance.addElement(mockLineElement());
    slide1Instance.setActiveElementIds([element0]);

    // change the element and switch back to slide0
    slide1Instance.updateElement(element0, { strokeColor: '#ff0000' });
    slide1Instance.setActiveElementIds([]);
    whiteboardInstance.setActiveSlideId(slide0);

    // delete slide 0
    whiteboardInstance.removeSlide(slide0);

    expect(whiteboardInstance.getSlideIds()).toEqual([slide1]);
    expect(whiteboardInstance.getActiveSlideId()).toEqual(slide1);
    expect(slide1Instance.getActiveElementIds()).toEqual([]);

    whiteboardInstance.undo();

    expect(whiteboardInstance.getSlideIds()).toEqual([slide0, slide1]);
    expect(whiteboardInstance.getActiveSlideId()).toEqual(slide0);
    expect(whiteboardInstance.getSlide(slide0).getActiveElementIds()).toEqual(
      []
    );
    expect(slide1Instance.getActiveElementIds()).toEqual([]);
    expect(slide1Instance.getElement(element0)).toMatchObject({
      strokeColor: '#ff0000',
    });

    whiteboardInstance.undo();

    expect(whiteboardInstance.getSlideIds()).toEqual([slide0, slide1]);
    expect(whiteboardInstance.getActiveSlideId()).toEqual(slide1);
    expect(slide1Instance.getActiveElementIds()).toEqual([element0]);
    expect(slide1Instance.getElement(element0)).toMatchObject({
      strokeColor: '#ffffff',
    });
  });

  it('should observe undo redo state', async () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    const undoRedoStates = firstValueFrom(
      whiteboardInstance.observeUndoRedoState().pipe(take(4), toArray())
    );

    const slide1 = whiteboardInstance.addSlide();
    expect(whiteboardInstance.getSlideIds()).toEqual([slide0, slide1]);

    whiteboardInstance.undo();
    expect(whiteboardInstance.getSlideIds()).toEqual([slide0]);

    whiteboardInstance.redo();
    expect(whiteboardInstance.getSlideIds()).toEqual([slide0, slide1]);

    expect(await undoRedoStates).toEqual([
      { canUndo: false, canRedo: false }, // at start
      { canUndo: true, canRedo: false }, // after add slide
      { canUndo: false, canRedo: true }, // after undo
      { canUndo: true, canRedo: false }, // after redo
    ]);
  });

  it('should close observables on destroy', async () => {
    const whiteboardInstance = new WhiteboardInstanceImpl(
      synchronizedDocument,
      communicationChannel,
      mockWhiteboard(),
      '@user-id'
    );

    const statistics = firstValueFrom(
      whiteboardInstance.observeWhiteboardStatistics().pipe(toArray())
    );
    const slideIds = firstValueFrom(
      whiteboardInstance.observeSlideIds().pipe(toArray())
    );
    const activeSlideId = firstValueFrom(
      whiteboardInstance.observeActiveSlideId().pipe(toArray())
    );
    const destroySlideSpy = jest.spyOn(
      whiteboardInstance.getSlide(slide0) as WhiteboardSlideInstanceImpl,
      'destroy'
    );
    const undoRedoState = firstValueFrom(
      whiteboardInstance.observeUndoRedoState().pipe(toArray())
    );
    const presentationState = firstValueFrom(
      whiteboardInstance
        .getPresentationManager()
        .observePresentationState()
        .pipe(toArray())
    );

    whiteboardInstance.destroy();

    expect(await statistics).toEqual([]);
    expect(await slideIds).toEqual([[slide0]]);
    expect(await activeSlideId).toEqual([slide0]);
    expect(await undoRedoState).toEqual([{ canUndo: false, canRedo: false }]);
    expect(await presentationState).toEqual([{ type: 'idle' }]);

    expect(synchronizedDocument.destroy).toBeCalled();
    expect(communicationChannel.destroy).toBeCalled();

    expect(destroySlideSpy).toBeCalled();
  });
});

describe('findNewActiveSlideId', () => {
  it('should keep selected slide', () => {
    expect(
      findNewActiveSlideId(
        'slide-1',
        ['slide-0', 'slide-1'],
        ['slide-0', 'slide-1']
      )
    ).toEqual('slide-1');
  });

  it('should select first slide', () => {
    expect(
      findNewActiveSlideId(
        undefined,
        ['slide-0', 'slide-1'],
        ['slide-0', 'slide-1']
      )
    ).toEqual('slide-0');
  });

  it('should handle no slides', () => {
    expect(findNewActiveSlideId(undefined, [], [])).toBeUndefined();
  });

  it('should handle removed slide', () => {
    expect(
      findNewActiveSlideId(
        'slide-1',
        ['slide-0', 'slide-2', 'slide-3'],
        ['slide-0', 'slide-1', 'slide-2', 'slide-3']
      )
    ).toEqual('slide-2');
  });

  it('should handle if last slide is removed', () => {
    expect(
      findNewActiveSlideId('slide-1', ['slide-0'], ['slide-0', 'slide-1'])
    ).toEqual('slide-0');
  });
});
