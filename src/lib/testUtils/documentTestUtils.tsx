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

import { WidgetApi } from '@matrix-widget-toolkit/api';
import { WidgetApiMockProvider } from '@matrix-widget-toolkit/react';
import { range } from 'lodash';
import { Fragment, PropsWithChildren, useState } from 'react';
import { Provider } from 'react-redux';
import { NEVER, Subject, of } from 'rxjs';
import {
  Element,
  PathElement,
  ShapeElement,
  Slide,
  SlideProvider,
  WhiteboardManager,
  WhiteboardManagerProvider,
  createWhiteboardDocument,
  useActiveSlide,
} from '../../state';
import {
  CommunicationChannel,
  Message,
  PeerConnectionStatistics,
} from '../../state/communication';
import { SharedMap, YArray, YMap } from '../../state/crdt/y';
import { WhiteboardInstanceImpl } from '../../state/whiteboardInstanceImpl';
import { createStore } from '../../store';
import { mockWhiteboard } from './matrixTestUtils';

type MockWhiteboardOptions =
  | { slideCount: number; slides?: undefined }
  | {
      slideCount?: undefined;
      slides: Array<[string, Array<[string, Element]>]>;
    };

/**
 * Creates a whiteboard manager that returns a single whiteboard with known test data.
 *
 * @remarks Only use for tests
 */
export function mockWhiteboardManager(
  opts: MockWhiteboardOptions = { slideCount: 1 },
): {
  whiteboardManager: jest.Mocked<WhiteboardManager>;
  communicationChannel: jest.Mocked<CommunicationChannel>;
  messageSubject: Subject<Message>;
  setPresentationMode: (enable: boolean, enableEdit?: boolean) => void;
} {
  const document = createWhiteboardDocument();

  // we can't use the existing operations because we want to have predictable
  // slide and element ids.
  document.performChange((doc) => {
    const slides =
      opts.slides ??
      range(opts.slideCount).map((idx) => [
        `slide-${idx}`,
        [[`element-${idx}`, mockEllipseElement()]],
      ]);

    doc.set('slideIds', YArray.from(slides.map(([id]) => id)));
    doc.set(
      'slides',
      new YMap(
        slides.map(([slideId, elements]) => {
          const slide = new YMap<unknown>() as SharedMap<Slide>;
          slide.set(
            'elements',
            new YMap(
              elements.map(([id, element]) => [
                id,
                new YMap(Object.entries(element)),
              ]),
            ),
          );
          slide.set('elementIds', YArray.from(elements.map(([id]) => id)));
          return [slideId, slide];
        }),
      ),
    );
  });

  // clear the undo manager after the initialization
  document.getUndoManager().clear();

  const messageSubject = new Subject<Message>();
  const communicationChannel = {
    broadcastMessage: jest.fn(),
    observeMessages: jest.fn(() => messageSubject),
    getStatistics: jest.fn(() => ({
      localSessionId: 'own',
      peerConnections: {
        'peer-0': mockPeerConnectionStatistics('@user-alice', 'connected'),
      },
    })),
    observeStatistics: jest.fn(() =>
      of({
        localSessionId: 'own',
        peerConnections: {
          'peer-0': mockPeerConnectionStatistics('@user-alice', 'connected'),
        },
      }),
    ),
    destroy: jest.fn(),
  };

  const synchronizedDocument = {
    getDocument: () => document,
    observeDocumentStatistics: () => NEVER,
    observeIsLoading: () => of(false),
    destroy: () => {},
  };

  const whiteboardInstance = new WhiteboardInstanceImpl(
    synchronizedDocument,
    communicationChannel,
    mockWhiteboard(),
    '@user-id',
  );

  const whiteboardManager: jest.Mocked<WhiteboardManager> = {
    getActiveWhiteboardInstance: jest.fn().mockReturnValue(whiteboardInstance),
    selectActiveWhiteboardInstance: jest.fn(),
  };

  return {
    whiteboardManager,
    communicationChannel,
    messageSubject,
    setPresentationMode: (enable, enableEdit) => {
      messageSubject.next({
        senderUserId: '@user-alice',
        senderSessionId: 'other',
        type: 'net.nordeck.whiteboard.present_slide',
        content: {
          view: enable
            ? {
                isEditMode: enableEdit ? enableEdit : false,
                slideId: 'slide-0',
              }
            : undefined,
        },
      });
    },
  };
}

/**
 * Register all providers that are needed to test components that use the whiteboard state.
 *
 * @remarks Only use for tests
 */
export function WhiteboardTestingContextProvider({
  children,
  whiteboardManager,
  widgetApi,
}: PropsWithChildren<{
  whiteboardManager: WhiteboardManager;
  widgetApi: WidgetApi;
}>) {
  const [store] = useState(() => createStore({ widgetApi }));
  return (
    <WidgetApiMockProvider value={widgetApi}>
      <Provider store={store}>
        <WhiteboardManagerProvider whiteboardManager={whiteboardManager}>
          <ProvideActiveSlide>{children}</ProvideActiveSlide>
        </WhiteboardManagerProvider>
      </Provider>
    </WidgetApiMockProvider>
  );
}

function ProvideActiveSlide({ children }: PropsWithChildren<{}>) {
  const { activeSlideId } = useActiveSlide();

  if (!activeSlideId) {
    return <Fragment />;
  }

  return <SlideProvider slideId={activeSlideId}>{children}</SlideProvider>;
}

export function mockPeerConnectionStatistics(
  remoteUserId: string,
  connectionState: string,
  remoteSessionId: string = 'other',
): PeerConnectionStatistics {
  return {
    remoteUserId,
    connectionState,
    remoteSessionId,
    impolite: true,
    bytesReceived: 0,
    bytesSent: 0,
    packetsReceived: 0,
    packetsSent: 0,
    signalingState: 'stable',
    iceConnectionState: 'connected',
    iceGatheringState: 'complete',
    dataChannelState: 'open',
  };
}

export function mockEllipseElement(shape: Partial<ShapeElement> = {}): Element {
  return {
    type: 'shape',
    kind: 'ellipse',
    position: { x: 0, y: 1 },
    fillColor: '#ffffff',
    height: 100,
    width: 50,
    text: '',
    ...shape,
  };
}

export function mockLineElement(path: Partial<PathElement> = {}): Element {
  return {
    type: 'path',
    kind: 'line',
    position: { x: 0, y: 1 },
    strokeColor: '#ffffff',
    points: [
      { x: 0, y: 1 },
      { x: 2, y: 3 },
    ],
    ...path,
  };
}

export function mockPolylineElement(path: Partial<PathElement> = {}): Element {
  return {
    type: 'path',
    kind: 'polyline',
    position: { x: 0, y: 1 },
    strokeColor: '#ffffff',
    points: [
      { x: 0, y: 1 },
      { x: 2, y: 3 },
      { x: 4, y: 5 },
    ],
    ...path,
  };
}

/**
 * Text elements are rectangles with a transparent background.
 */
export function mockTextElement(shape: Partial<ShapeElement> = {}): Element {
  return {
    type: 'shape',
    kind: 'rectangle',
    position: { x: 0, y: 1 },
    fillColor: 'transparent',
    height: 100,
    width: 50,
    text: 'text',
    ...shape,
  };
}

/**
 * Mock the fullscreen API {@link https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API}
 *
 * Set document.fullscreenElement to null.
 * Mock document.exitFullscreen() to reset document.fullscreenElement to null.
 * Also mock document.documentElement.requestFullscreen() to set document.fullscreenElement to an empty object.
 * Both mocked functions dispatch a "fullscreenchange" event on document and return a resolved Promise.
 */
export function mockFullscreenApi(): void {
  // Ignore TS and linter here for setting a mocked API
  // @ts-ignore
  // eslint-disable-next-line
  document.fullscreenElement = null;

  document.exitFullscreen = jest.fn(function () {
    // Ignore TS and linter here for setting a mocked API
    // @ts-ignore
    // eslint-disable-next-line
    document.fullscreenElement = null;
    document.dispatchEvent(new Event('fullscreenchange'));
    return Promise.resolve();
  });

  document.documentElement.requestFullscreen = jest.fn(function () {
    // Ignore TS and linter here for setting a mocked API
    // @ts-ignore
    // eslint-disable-next-line
    document.fullscreenElement = {};
    document.dispatchEvent(new Event('fullscreenchange'));
    return Promise.resolve();
  });
}
