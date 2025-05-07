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

import { nanoid } from '@reduxjs/toolkit';
import { waitFor } from '@testing-library/react';
import { last } from 'lodash';
import { firstValueFrom, skip, Subject, take, toArray } from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from 'vitest';
import {
  mockEllipseElement,
  mockLineElement,
  mockRectangleElement,
} from '../lib/testUtils/documentTestUtils';
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
import { Elements } from './types';
import { WhiteboardSlideInstanceImpl } from './whiteboardSlideInstanceImpl';

const slide0 = 'IN4h74suMiIAK4AVMAdl_';

vi.mock('@reduxjs/toolkit', async () => ({
  ...(await vi.importActual<typeof import('@reduxjs/toolkit')>(
    '@reduxjs/toolkit',
  )),
  nanoid: vi.fn(),
}));

beforeEach(() => {
  let count = 0;
  vi.mocked(nanoid).mockImplementation(() => `mock-nanoid-${count++}`);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WhiteboardSlideInstanceImpl', () => {
  const observeStatisticsSubject =
    new Subject<CommunicationChannelStatistics>();
  let messageChannel: Subject<Message>;
  let communicationChannel: Mocked<CommunicationChannel>;
  let document: Document<WhiteboardDocument>;

  beforeEach(async () => {
    messageChannel = new Subject<Message>();
    communicationChannel = {
      broadcastMessage: vi.fn(),
      observeMessages: vi.fn().mockReturnValue(messageChannel),
      getStatistics: vi
        .fn()
        .mockReturnValue({ localSessionId: 'own', peerConnections: {} }),
      observeStatistics: vi.fn().mockReturnValue(observeStatisticsSubject),
      destroy: vi.fn(),
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

  it('should add line and shape elements and connect', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const elementLine = mockLineElement();
    const elementLineId = slideInstance.addElement(elementLine);
    const elementShape = mockRectangleElement();
    const elementShapeId = slideInstance.addElement(elementShape);

    slideInstance.updateElements([
      {
        elementId: elementLineId,
        patch: {
          connectedElementStart: elementShapeId,
        },
      },
      {
        elementId: elementShapeId,
        patch: {
          connectedPaths: [elementLineId],
        },
      },
    ]);

    expect(slideInstance.getElement(elementLineId)).toEqual({
      ...elementLine,
      connectedElementStart: elementShapeId,
    });
    expect(slideInstance.getElement(elementShapeId)).toEqual({
      ...elementShape,
      connectedPaths: [elementLineId],
    });
  });

  it('should add elements and select them as active elements', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element0 = mockEllipseElement();
    const element1 = mockLineElement();
    const elementIds = slideInstance.addElements([element0, element1]);

    expect(slideInstance.getElement(elementIds[0])).toEqual(element0);
    expect(slideInstance.getElement(elementIds[1])).toEqual(element1);
    expect(slideInstance.getActiveElementIds()).toEqual(elementIds);
  });

  it('should add elements without connections and select them as active elements', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element0 = mockEllipseElement();
    const element1 = mockLineElement();

    const elements: Elements = {
      [`element-id-0`]: element0,
      [`element-id-1`]: element1,
    };

    const elementIds = slideInstance.addElementsWithConnections(elements);
    expect(elementIds).toEqual(['mock-nanoid-0', 'mock-nanoid-1']);

    expect(slideInstance.getElements(elementIds)).toEqual({
      [`mock-nanoid-0`]: element0,
      [`mock-nanoid-1`]: element1,
    });
    expect(slideInstance.getActiveElementIds()).toEqual(elementIds);
  });

  it('should add connected elements and select them as active elements', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element0 = mockEllipseElement();
    const element1 = mockLineElement({
      connectedElementStart: 'element-id-2',
      connectedElementEnd: 'element-id-3',
    });
    const element2 = mockEllipseElement({ connectedPaths: ['element-id-1'] });
    const element3 = mockEllipseElement({ connectedPaths: ['element-id-1'] });

    const elements: Elements = {
      [`element-id-0`]: element0,
      [`element-id-1`]: element1,
      [`element-id-2`]: element2,
      [`element-id-3`]: element3,
    };

    const elementIds = slideInstance.addElementsWithConnections(elements);
    expect(elementIds).toEqual([
      'mock-nanoid-0',
      'mock-nanoid-1',
      'mock-nanoid-2',
      'mock-nanoid-3',
    ]);

    expect(slideInstance.getElements(elementIds)).toEqual({
      [`mock-nanoid-0`]: element0,
      [`mock-nanoid-1`]: mockLineElement({
        connectedElementStart: 'mock-nanoid-2',
        connectedElementEnd: 'mock-nanoid-3',
      }),
      [`mock-nanoid-2`]: mockEllipseElement({
        connectedPaths: ['mock-nanoid-1'],
      }),
      [`mock-nanoid-3`]: mockEllipseElement({
        connectedPaths: ['mock-nanoid-1'],
      }),
    });
    expect(slideInstance.getActiveElementIds()).toEqual(elementIds);
  });

  it('should add connected elements and filter out unknown connection data and select them as active elements', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element0 = mockEllipseElement();
    const element1 = mockLineElement({
      connectedElementStart: 'unknown-id-1',
      connectedElementEnd: 'element-id-3',
    });
    const element2 = mockEllipseElement({ connectedPaths: ['unknown-id-2'] });
    const element3 = mockEllipseElement({ connectedPaths: ['element-id-1'] });

    const elements: Elements = {
      [`element-id-0`]: element0,
      [`element-id-1`]: element1,
      [`element-id-2`]: element2,
      [`element-id-3`]: element3,
    };

    const elementIds = slideInstance.addElementsWithConnections(elements);
    expect(elementIds).toEqual([
      'mock-nanoid-0',
      'mock-nanoid-1',
      'mock-nanoid-2',
      'mock-nanoid-3',
    ]);

    expect(slideInstance.getElements(elementIds)).toEqual({
      [`mock-nanoid-0`]: element0,
      [`mock-nanoid-1`]: mockLineElement({
        connectedElementEnd: 'mock-nanoid-3',
      }),
      [`mock-nanoid-2`]: mockEllipseElement(),
      [`mock-nanoid-3`]: mockEllipseElement({
        connectedPaths: ['mock-nanoid-1'],
      }),
    });
    expect(slideInstance.getActiveElementIds()).toEqual(elementIds);
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

    expect(() => slideInstance.addElement(element)).toThrow(
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

    const setActiveElementIdSpy = vi.spyOn(slideInstance, 'setActiveElementId');

    const performChangeSpy = vi
      .spyOn(document, 'performChange')
      .mockImplementation((callback) => {
        const elementId = last(setActiveElementIdSpy.mock.calls)?.[0];

        callback(document.getData());

        expect(elementId).toEqual(expect.any(String));
        expect(elementId).toEqual(slideInstance.getActiveElementId());
      });

    const element0 = slideInstance.addElement(mockLineElement());

    expect(performChangeSpy).toHaveBeenCalled();
    expect(slideInstance.getActiveElementId()).toEqual(element0);
  });

  it('should remove a single element', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);

    expect(slideInstance.getElement(element0)).toEqual(element);

    slideInstance.removeElements([element0]);

    expect(slideInstance.getElement(element0)).toBeUndefined();
  });

  describe('removeElements', () => {
    it('should remove multiple elements', () => {
      const slideInstance = new WhiteboardSlideInstanceImpl(
        communicationChannel,
        slide0,
        document,
        '@user-id',
      );

      const element1 = mockLineElement();
      const element1Id = slideInstance.addElement(element1);
      const element2 = mockLineElement();
      const element2Id = slideInstance.addElement(element2);
      const element3 = mockLineElement();
      const element3Id = slideInstance.addElement(element3);

      slideInstance.removeElements([element1Id, element2Id]);

      // check whether the elements to be removed are actually removed
      expect(slideInstance.getElement(element1Id)).toBeUndefined();
      expect(slideInstance.getElement(element2Id)).toBeUndefined();

      // chat that the elements not to be removed are still there
      expect(slideInstance.getElement(element3Id)).toEqual(element3);
    });
  });

  it('should remove connected shape', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const elementLine = mockLineElement();
    const elementLineId = slideInstance.addElement(elementLine);
    const elementShape = mockRectangleElement();
    const elementShapeId = slideInstance.addElement(elementShape);

    slideInstance.updateElements([
      {
        elementId: elementLineId,
        patch: {
          connectedElementStart: elementShapeId,
        },
      },
      {
        elementId: elementShapeId,
        patch: {
          connectedPaths: [elementLineId],
        },
      },
    ]);
    slideInstance.removeElements([elementShapeId]);

    expect(slideInstance.getElement(elementLineId)).toEqual(elementLine);
  });

  it('should remove connected line', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const elementLine = mockLineElement();
    const elementLineId = slideInstance.addElement(elementLine);
    const elementShape = mockRectangleElement();
    const elementShapeId = slideInstance.addElement(elementShape);

    slideInstance.updateElements([
      {
        elementId: elementLineId,
        patch: {
          connectedElementStart: elementShapeId,
        },
      },
      {
        elementId: elementShapeId,
        patch: {
          connectedPaths: [elementLineId],
        },
      },
    ]);
    slideInstance.removeElements([elementLineId]);

    expect(slideInstance.getElement(elementShapeId)).toEqual(elementShape);
  });

  it('should remove connected line with two connections to shape', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const elementLine = mockLineElement();
    const elementLineId = slideInstance.addElement(elementLine);
    const elementShape = mockRectangleElement();
    const elementShapeId = slideInstance.addElement(elementShape);

    slideInstance.updateElements([
      {
        elementId: elementLineId,
        patch: {
          connectedElementStart: elementShapeId,
          connectedElementEnd: elementShapeId,
        },
      },
      {
        elementId: elementShapeId,
        patch: {
          connectedPaths: [elementLineId, elementLineId],
        },
      },
    ]);
    slideInstance.removeElements([elementLineId]);

    expect(slideInstance.getElement(elementShapeId)).toEqual(elementShape);
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

    expect(() => slideInstance.removeElements([element0])).toThrow(
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

  it('should update elements', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element1 = mockEllipseElement();
    const elementId0 = slideInstance.addElement(element);
    const elementId1 = slideInstance.addElement(element1);

    expect(slideInstance.getElement(elementId0)).toEqual(element);
    expect(slideInstance.getElement(elementId1)).toEqual(element1);

    const updates = [
      {
        elementId: elementId0,
        patch: {
          strokeColor: '#000000',
        },
      },
      {
        elementId: elementId1,
        patch: {
          strokeColor: '#ff0000',
        },
      },
    ];
    slideInstance.updateElements(updates);

    expect(slideInstance.getElement(elementId0)).toEqual({
      ...element,
      strokeColor: '#000000',
    });
    expect(slideInstance.getElement(elementId1)).toEqual({
      ...element1,
      strokeColor: '#ff0000',
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
    ).toThrow('Can not modify slide, slide is locked');
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

    slideInstance.moveElementsToBottom([element2]);

    expect(slideInstance.getElementIds()).toEqual([
      element2,
      element0,
      element1,
    ]);
  });

  it('should move elements to bottom', () => {
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

    slideInstance.moveElementsToBottom([element1, element2]);

    expect(slideInstance.getElementIds()).toEqual([
      element1,
      element2,
      element0,
    ]);
  });

  it('should move elements to bottom when order is different to elements in the slide', () => {
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

    slideInstance.moveElementsToBottom([element2, element1]);

    expect(slideInstance.getElementIds()).toEqual([
      element1,
      element2,
      element0,
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

    expect(() => slideInstance.moveElementsToBottom([element0])).toThrow(
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

    expect(() => slideInstance.moveElementDown(element0)).toThrow(
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

    expect(() => slideInstance.moveElementUp(element0)).toThrow(
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

    slideInstance.moveElementsToTop([element0]);

    expect(slideInstance.getElementIds()).toEqual([
      element1,
      element2,
      element0,
    ]);
  });

  it('should move elements to top', () => {
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

    slideInstance.moveElementsToTop([element0, element1]);

    expect(slideInstance.getElementIds()).toEqual([
      element2,
      element0,
      element1,
    ]);
  });

  it('should move elements to top when order is different to elements in the slide', () => {
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

    slideInstance.moveElementsToTop([element1, element0]);

    expect(slideInstance.getElementIds()).toEqual([
      element2,
      element0,
      element1,
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

    expect(() => slideInstance.moveElementsToTop([element0])).toThrow(
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
    slideInstance.removeElements([element0]);

    expect(await elementUpdates).toEqual([
      element,
      { ...element, strokeColor: '#000000' },
      undefined,
    ]);
  });

  it('should observe elements', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element1 = mockEllipseElement();
    const elementId0 = slideInstance.addElement(element);
    const elementId1 = slideInstance.addElement(element1);

    const elementUpdates = firstValueFrom(
      slideInstance
        .observeElements([elementId0, elementId1])
        .pipe(take(3), toArray()),
    );

    slideInstance.updateElement(elementId0, {
      strokeColor: '#000000',
    });
    slideInstance.removeElements([elementId0]);

    expect(await elementUpdates).toEqual([
      { [elementId0]: element, [elementId1]: element1 },
      {
        [elementId0]: { ...element, strokeColor: '#000000' },
        [elementId1]: element1,
      },
      { [elementId1]: element1 },
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
    slideInstance.removeElements([element0]);

    expect(await elementIds).toEqual([
      [],
      [element0],
      [element0, element1],
      [element1],
    ]);
  });

  it('should observe cursor positions', async () => {
    vi.useFakeTimers();

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

    vi.advanceTimersByTime(1000);

    expect(await cursorPositions).toEqual([
      { '@user-id': { x: 1, y: 2 }, '@another-user-id': { x: 2, y: 1 } },
    ]);
  });

  it('should combine cursor positions from different sessions of the same user', async () => {
    vi.useFakeTimers();

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

    vi.advanceTimersByTime(1000);

    messageChannel.next({
      type: 'net.nordeck.whiteboard.cursor_update',
      content: {
        slideId: slide0,
        position: { x: 2, y: 1 },
      },
      senderUserId: '@user-id',
      senderSessionId: 'another-session-id',
    });

    vi.advanceTimersByTime(1000);

    expect(await cursorPositions).toEqual([
      { '@user-id': { x: 1, y: 2 } },
      { '@user-id': { x: 2, y: 1 } },
    ]);
  });

  it('should ignore cursor positions for other slides', async () => {
    vi.useFakeTimers();

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

    vi.advanceTimersByTime(1000);

    messageChannel.next({
      type: 'net.nordeck.whiteboard.cursor_update',
      content: {
        slideId: 'another-slide',
        position: { x: 2, y: 1 },
      },
      senderUserId: '@user-id',
      senderSessionId: 'session-id',
    });

    vi.advanceTimersByTime(1000);

    expect(await cursorPositions).toEqual([{ '@user-id': { x: 1, y: 2 } }]);
  });

  it('should forget cursors after 5 seconds', async () => {
    vi.useFakeTimers();

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

    vi.advanceTimersByTime(4999);
    expect(await firstCursorPosition).toEqual({ '@user-id': { x: 1, y: 2 } });

    vi.advanceTimersByTime(1);
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
      expect(communicationChannel.broadcastMessage).toHaveBeenCalledWith(
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
      expect(communicationChannel.broadcastMessage).toHaveBeenCalledTimes(2);
    });

    expect(communicationChannel.broadcastMessage).toHaveBeenCalledWith(
      'net.nordeck.whiteboard.cursor_update',
      { slideId: slide0, position: { x: 1, y: 2 } },
    );
    expect(communicationChannel.broadcastMessage).toHaveBeenCalledWith(
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
      slideInstance.observeActiveElementId().pipe(take(4), toArray()),
    );

    const element0 = slideInstance.addElement(mockLineElement());
    slideInstance.setActiveElementId('not-exists');
    slideInstance.setActiveElementId(element0);

    expect(slideInstance.getActiveElementId()).toEqual(element0);
    expect(await observedActiveElement).toEqual([
      undefined,
      element0,
      undefined,
      element0,
    ]);
  });

  it('should select multiple elements', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element0 = slideInstance.addElement(mockLineElement());
    const element1 = slideInstance.addElement(mockLineElement());
    slideInstance.setActiveElementId('not-exists');

    const observedActiveElements = firstValueFrom(
      slideInstance.observeActiveElementIds().pipe(take(3), toArray()),
    );

    expect(slideInstance.getActiveElementIds()).toEqual([]);

    slideInstance.addActiveElementId(element0);
    slideInstance.addActiveElementId(element1);
    slideInstance.addActiveElementId(element1);

    expect(slideInstance.getActiveElementIds()).toEqual([element0, element1]);
    expect(await observedActiveElements).toEqual([
      [],
      [element0],
      [element0, element1],
    ]);
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

  it('should unselect specific elements when multiple elements are selected', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element0 = slideInstance.addElement(mockLineElement());
    const element1 = slideInstance.addElement(mockLineElement());
    slideInstance.setActiveElementId('not-exists');

    const observedActiveElement = firstValueFrom(
      slideInstance.observeActiveElementIds().pipe(take(5), toArray()),
    );

    slideInstance.addActiveElementId(element0);
    slideInstance.addActiveElementId(element1);
    slideInstance.unselectActiveElementId(element0);
    slideInstance.unselectActiveElementId(element1);

    expect(slideInstance.getActiveElementIds()).toEqual([]);
    expect(await observedActiveElement).toEqual([
      [],
      [element0],
      [element0, element1],
      [element1],
      [],
    ]);
  });

  it('should sort given element IDs based on the order of element IDs in the slide ignoring unknown ones', () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element = mockLineElement();
    const element0 = slideInstance.addElement(element);
    const element1 = slideInstance.addElement(element);

    expect(
      slideInstance.sortElementIds([element1, element0, 'not-exists']),
    ).toEqual([element0, element1]);
  });

  it('should check if specific element is active when multiple elements are selected', async () => {
    const slideInstance = new WhiteboardSlideInstanceImpl(
      communicationChannel,
      slide0,
      document,
      '@user-id',
    );

    const element0 = slideInstance.addElement(mockLineElement());
    const element1 = slideInstance.addElement(mockLineElement());
    slideInstance.setActiveElementId(undefined);
    slideInstance.addActiveElementId(element0);

    expect(slideInstance.getActiveElementIds()).toEqual([element0]);

    slideInstance.addActiveElementId(element1);
    expect(slideInstance.getActiveElementIds()).toEqual([element0, element1]);
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
    slideInstance.removeElements([element0]);

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
