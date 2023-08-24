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

import { waitFor } from '@testing-library/react';
import { last } from 'lodash';
import { firstValueFrom, skip, Subject, take, toArray } from 'rxjs';
import { mockLineElement } from '../lib/testUtils/documentTestUtils';
import {
  CommunicationChannel,
  CommunicationChannelStatistics,
  Message,
} from './communication';
import {
  createWhiteboardDocument,
  Document,
  generateAddElement,
  generateRemoveElement,
  getSlideLock,
  WhiteboardDocument,
} from './crdt';
import { WhiteboardSlideInstanceImpl } from './whiteboardSlideInstanceImpl';

const slide0 = 'IN4h74suMiIAK4AVMAdl_';

afterEach(() => jest.useRealTimers());

describe('WhiteboardSlideInstanceImpl', () => {
  const observeStatisticsSubject =
    new Subject<CommunicationChannelStatistics>();
  let messageChannel: Subject<Message>;
  let communicationChannel: jest.Mocked<CommunicationChannel>;
  let document: Document<WhiteboardDocument>;

  beforeEach(async () => {
    messageChannel = new Subject<Message>();
    communicationChannel = {
      broadcastMessage: jest.fn(),
      observeMessages: jest.fn().mockReturnValue(messageChannel),
      getStatistics: jest
        .fn()
        .mockReturnValue({ localSessionId: 'own', peerConnections: {} }),
      observeStatistics: jest.fn().mockReturnValue(observeStatisticsSubject),
      destroy: jest.fn(),
    };

    document = createWhiteboardDocument();
  });

  it('should lock slide', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    slideInstance.lockSlide();

    expect(getSlideLock(document.getData(), slide0)).toEqual({
      userId: '@user-id',
    });
    expect(slideInstance.isLocked()).toEqual(true);
  });

  it('should unlock a slide', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    slideInstance.lockSlide();
    slideInstance.unlockSlide();

    expect(slideInstance.isLocked()).toEqual(false);
  });

  it('should add element and select it as active element', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);

    expect(slideInstance.getElement(element0)).toEqual(element);
    expect(slideInstance.getActiveElementId()).toEqual(element0);
  });

  it('should throw when adding element to a locked slide', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );
    slideInstance.lockSlide();

    const element = mockLineElement();

    expect(() => slideInstance.addElement(element)).toThrowError(
      'Can not modify slide, slide is locked',
    );
  });

  it('should select the active element before adding the element to the document', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const setActiveElementIdSpy = jest.spyOn(
      slideInstance,
      'setActiveElementId',
    );

    const performChangeSpy = jest
      .spyOn(document, 'performChange')
      .mockImplementation((callback) => {
        const elementId = last(setActiveElementIdSpy.mock.calls)?.[0];

        callback(document.getData());

        expect(elementId).toEqual(expect.any(String));
        expect(elementId).toEqual(slideInstance.getActiveElementId());
      });

    const element0 = slideInstance.addElement(mockLineElement());

    expect(performChangeSpy).toBeCalled();
    expect(slideInstance.getActiveElementId()).toEqual(element0);
  });

  it('should remove element', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);

    expect(slideInstance.getElement(element0)).toEqual(element);

    slideInstance.removeElement(element0);

    expect(slideInstance.getElement(element0)).toBeUndefined();
  });

  it('should throw when removing element from a locked slide', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );
    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);
    slideInstance.lockSlide();

    expect(() => slideInstance.removeElement(element0)).toThrowError(
      'Can not modify slide, slide is locked',
    );
  });

  it('should update element', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);

    expect(slideInstance.getElement(element0)).toEqual(element);

    slideInstance.updateElement(element0, {
      strokeColor: '#000000',
    });

    expect(slideInstance.getElement(element0)).toEqual({
      ...element,
      strokeColor: '#000000',
    });
  });

  it('should throw when updating element on a locked slide', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );
    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);
    slideInstance.lockSlide();

    expect(() =>
      slideInstance.updateElement(element0, {
        strokeColor: '#000000',
      }),
    ).toThrowError('Can not modify slide, slide is locked');
  });

  it('should move element to bottom', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);
    const element1 = slideInstance.addElement(element);
    const element2 = slideInstance.addElement(element);

    expect(slideInstance.getElementIds()).toEqual([
      element0,
      element1,
      element2,
    ]);

    slideInstance.moveElementToBottom(element2);

    expect(slideInstance.getElementIds()).toEqual([
      element2,
      element0,
      element1,
    ]);
  });

  it('should throw when moving element to bottom on a locked slide', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);
    slideInstance.lockSlide();

    expect(() => slideInstance.moveElementToBottom(element0)).toThrowError(
      'Can not modify slide, slide is locked',
    );
  });

  it('should move element down', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);
    const element1 = slideInstance.addElement(element);
    const element2 = slideInstance.addElement(element);

    expect(slideInstance.getElementIds()).toEqual([
      element0,
      element1,
      element2,
    ]);

    slideInstance.moveElementDown(element2);

    expect(slideInstance.getElementIds()).toEqual([
      element0,
      element2,
      element1,
    ]);
  });

  it('should throw when moving element down on a locked slide', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);
    slideInstance.lockSlide();

    expect(() => slideInstance.moveElementDown(element0)).toThrowError(
      'Can not modify slide, slide is locked',
    );
  });

  it('should move element up', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);
    const element1 = slideInstance.addElement(element);
    const element2 = slideInstance.addElement(element);

    expect(slideInstance.getElementIds()).toEqual([
      element0,
      element1,
      element2,
    ]);

    slideInstance.moveElementUp(element1);

    expect(slideInstance.getElementIds()).toEqual([
      element0,
      element2,
      element1,
    ]);
  });

  it('should throw when moving element up on a locked slide', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);
    slideInstance.lockSlide();

    expect(() => slideInstance.moveElementUp(element0)).toThrowError(
      'Can not modify slide, slide is locked',
    );
  });

  it('should move element to top', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);
    const element1 = slideInstance.addElement(element);
    const element2 = slideInstance.addElement(element);

    expect(slideInstance.getElementIds()).toEqual([
      element0,
      element1,
      element2,
    ]);

    slideInstance.moveElementToTop(element0);

    expect(slideInstance.getElementIds()).toEqual([
      element1,
      element2,
      element0,
    ]);
  });

  it('should throw when moving element to top on a locked slide', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);
    slideInstance.lockSlide();

    expect(() => slideInstance.moveElementToTop(element0)).toThrowError(
      'Can not modify slide, slide is locked',
    );
  });

  it('should observe element', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);

    const elementUpdates = firstValueFrom(
      slideInstance.observeElement(element0).pipe(take(3), toArray()),
    );

    slideInstance.updateElement(element0, {
      strokeColor: '#000000',
    });
    slideInstance.removeElement(element0);

    expect(await elementUpdates).toEqual([
      element,
      { ...element, strokeColor: '#000000' },
      undefined,
    ]);
  });

  it('should observe element ids', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const elementIds = firstValueFrom(
      slideInstance.observeElementIds().pipe(take(4), toArray()),
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);
    const element1 = slideInstance.addElement(element);
    slideInstance.removeElement(element0);

    expect(await elementIds).toEqual([
      [],
      [element0],
      [element0, element1],
      [element1],
    ]);
  });

  it('should observe cursor positions', async () => {
    jest.useFakeTimers();

    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const cursorPositions = firstValueFrom(
      slideInstance.observeCursorPositions().pipe(take(1), toArray()),
    );

    messageChannel.next({
      type: 'net.nordeck.whiteboard.cursor_update',
      content: {
        slideId: slide0,
        position: { x: 1, y: 2 },
      },
      senderUserId: '@user-id',
      senderSessionId: 'session-id',
    });

    messageChannel.next({
      type: 'net.nordeck.whiteboard.cursor_update',
      content: {
        slideId: slide0,
        position: { x: 2, y: 1 },
      },
      senderUserId: '@another-user-id',
      senderSessionId: 'session-id',
    });

    jest.advanceTimersByTime(1000);

    expect(await cursorPositions).toEqual([
      { '@user-id': { x: 1, y: 2 }, '@another-user-id': { x: 2, y: 1 } },
    ]);
  });

  it('should combine cursor positions from different sessions of the same user', async () => {
    jest.useFakeTimers();

    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const cursorPositions = firstValueFrom(
      slideInstance.observeCursorPositions().pipe(take(2), toArray()),
    );

    messageChannel.next({
      type: 'net.nordeck.whiteboard.cursor_update',
      content: {
        slideId: slide0,
        position: { x: 1, y: 2 },
      },
      senderUserId: '@user-id',
      senderSessionId: 'session-id',
    });

    jest.advanceTimersByTime(1000);

    messageChannel.next({
      type: 'net.nordeck.whiteboard.cursor_update',
      content: {
        slideId: slide0,
        position: { x: 2, y: 1 },
      },
      senderUserId: '@user-id',
      senderSessionId: 'another-session-id',
    });

    jest.advanceTimersByTime(1000);

    expect(await cursorPositions).toEqual([
      { '@user-id': { x: 1, y: 2 } },
      { '@user-id': { x: 2, y: 1 } },
    ]);
  });

  it('should ignore cursor positions for other slides', async () => {
    jest.useFakeTimers();

    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const cursorPositions = firstValueFrom(
      slideInstance.observeCursorPositions().pipe(take(1), toArray()),
    );

    messageChannel.next({
      type: 'net.nordeck.whiteboard.cursor_update',
      content: {
        slideId: slide0,
        position: { x: 1, y: 2 },
      },
      senderUserId: '@user-id',
      senderSessionId: 'session-id',
    });

    jest.advanceTimersByTime(1000);

    messageChannel.next({
      type: 'net.nordeck.whiteboard.cursor_update',
      content: {
        slideId: 'another-slide',
        position: { x: 2, y: 1 },
      },
      senderUserId: '@user-id',
      senderSessionId: 'session-id',
    });

    jest.advanceTimersByTime(1000);

    expect(await cursorPositions).toEqual([{ '@user-id': { x: 1, y: 2 } }]);
  });

  it('should forget cursors after 5 seconds', async () => {
    jest.useFakeTimers();

    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const firstCursorPosition = firstValueFrom(
      slideInstance.observeCursorPositions().pipe(take(1)),
    );
    const secondCursorPosition = firstValueFrom(
      slideInstance.observeCursorPositions().pipe(skip(1), take(1)),
    );

    messageChannel.next({
      type: 'net.nordeck.whiteboard.cursor_update',
      content: {
        slideId: slide0,
        position: { x: 1, y: 2 },
      },
      senderUserId: '@user-id',
      senderSessionId: 'session-id',
    });

    jest.advanceTimersByTime(4999);
    expect(await firstCursorPosition).toEqual({ '@user-id': { x: 1, y: 2 } });

    jest.advanceTimersByTime(1);
    expect(await secondCursorPosition).toEqual({});
  });

  it('should publish cursor position', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    slideInstance.publishCursorPosition({ x: 1, y: 2 });

    await waitFor(() => {
      expect(communicationChannel.broadcastMessage).toBeCalledWith(
        'net.nordeck.whiteboard.cursor_update',
        { slideId: slide0, position: { x: 1, y: 2 } },
      );
    });
  });

  it('should throttle publishing cursor position', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    slideInstance.publishCursorPosition({ x: 1, y: 2 });
    slideInstance.publishCursorPosition({ x: 3, y: 4 });
    slideInstance.publishCursorPosition({ x: 5, y: 6 });
    slideInstance.publishCursorPosition({ x: 7, y: 8 });

    await waitFor(() => {
      expect(communicationChannel.broadcastMessage).toBeCalledTimes(2);
    });

    expect(communicationChannel.broadcastMessage).toBeCalledWith(
      'net.nordeck.whiteboard.cursor_update',
      { slideId: slide0, position: { x: 1, y: 2 } },
    );
    expect(communicationChannel.broadcastMessage).toBeCalledWith(
      'net.nordeck.whiteboard.cursor_update',
      { slideId: slide0, position: { x: 7, y: 8 } },
    );
  });

  it('should switch to a specific element', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const observedActiveElement = firstValueFrom(
      slideInstance.observeActiveElementId().pipe(take(2), toArray()),
    );

    const element0 = slideInstance.addElement(mockLineElement());
    slideInstance.setActiveElementId('not-exists');
    slideInstance.setActiveElementId(element0);

    expect(slideInstance.getActiveElementId()).toEqual(element0);
    expect(await observedActiveElement).toEqual([undefined, element0]);
  });

  it('should unset a selected element to a specific element', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const observedActiveElement = firstValueFrom(
      slideInstance.observeActiveElementId().pipe(take(3), toArray()),
    );

    const element0 = slideInstance.addElement(mockLineElement());

    slideInstance.setActiveElementId(undefined);

    expect(slideInstance.getActiveElementId()).toEqual(undefined);
    expect(await observedActiveElement).toEqual([
      undefined,
      element0,
      undefined,
    ]);
  });

  it('should keep the selected element id to a specific element', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const [addElement, element0] = generateAddElement(
      slide0,
      mockLineElement(),
    );
    const removeElement = generateRemoveElement(slide0, element0);

    slideInstance.setActiveElementId(element0);

    document.performChange(addElement);
    expect(slideInstance.getActiveElementId()).toEqual(element0);

    document.performChange(removeElement);
    expect(slideInstance.getActiveElementId()).toEqual(undefined);

    document.performChange(addElement);
    expect(slideInstance.getActiveElementId()).toEqual(element0);
  });

  it('should deselect the active element when removed', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const observedActiveElement = firstValueFrom(
      slideInstance.observeActiveElementId().pipe(take(3), toArray()),
    );

    const element0 = slideInstance.addElement(mockLineElement());

    slideInstance.setActiveElementId(element0);
    slideInstance.removeElement(element0);

    expect(slideInstance.getActiveElementId()).toEqual(undefined);
    expect(await observedActiveElement).toEqual([
      undefined,
      element0,
      undefined,
    ]);
  });

  it('should observe locked state', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const lockUpdates = firstValueFrom(
      slideInstance.observeIsLocked().pipe(take(3), toArray()),
    );

    slideInstance.lockSlide();
    slideInstance.lockSlide();
    slideInstance.unlockSlide();

    expect(await lockUpdates).toEqual([false, true, false]);
  });

  it('should close observables on destroy', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);

    const elementIds = firstValueFrom(
      slideInstance.observeElementIds().pipe(toArray()),
    );
    const elementUpdates = firstValueFrom(
      slideInstance.observeElement(element0).pipe(toArray()),
    );
    const cursorPositions = firstValueFrom(
      slideInstance.observeCursorPositions().pipe(toArray()),
    );
    const activeElement = firstValueFrom(
      slideInstance.observeActiveElementId().pipe(toArray()),
    );
    const isLocked = firstValueFrom(
      slideInstance.observeIsLocked().pipe(toArray()),
    );

    slideInstance.destroy();

    expect(await elementIds).toEqual([[element0]]);
    expect(await elementUpdates).toEqual([element]);
    expect(await cursorPositions).toEqual([]);
    expect(await activeElement).toEqual([element0]);
    expect(await isLocked).toEqual([false]);
  });
});
