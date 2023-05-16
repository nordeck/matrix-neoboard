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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { render, screen } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { Subject } from 'rxjs';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../../lib/testUtils/documentTestUtils';
import { mockRoomMember } from '../../../lib/testUtils/matrixTestUtils';
import { WhiteboardManager } from '../../../state';
import { Message } from '../../../state/communication';
import { SvgCanvas } from '../SvgCanvas';
import { CursorRenderer } from './CursorRenderer';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<CursorRenderer>', () => {
  let messageSubject: Subject<Message>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    ({ whiteboardManager, messageSubject } = mockWhiteboardManager());

    widgetApi.mockSendStateEvent(mockRoomMember());

    Wrapper = ({ children }) => (
      <WhiteboardTestingContextProvider
        whiteboardManager={whiteboardManager}
        widgetApi={widgetApi}
      >
        <SvgCanvas viewportWidth={200} viewportHeight={200}>
          {children}
        </SvgCanvas>
      </WhiteboardTestingContextProvider>
    );
  });

  it('should render without exploding', async () => {
    render(<CursorRenderer />, { wrapper: Wrapper });

    messageSubject.next({
      type: 'net.nordeck.whiteboard.cursor_update',
      content: { slideId: 'slide-0', position: { x: 10, y: 20 } },
      senderSessionId: 'session-id',
      senderUserId: '@another-user-id',
    });
    messageSubject.next({
      type: 'net.nordeck.whiteboard.cursor_update',
      content: { slideId: 'slide-0', position: { x: 30, y: 40 } },
      senderSessionId: 'session-id',
      senderUserId: '@user-alice',
    });

    await expect(screen.findByText('Alice')).resolves.toBeInTheDocument();
    await expect(
      screen.findByText('@another-user-id')
    ).resolves.toBeInTheDocument();
  });
});
