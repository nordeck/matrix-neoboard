/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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
import { render, screen, waitFor } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, Mocked } from 'vitest';
import { App } from './App';
import { GuidedTourProvider } from './components/GuidedTour';
import { LayoutStateProvider } from './components/Layout';
import { SnackbarProvider } from './components/Snackbar';
import { WhiteboardHotkeysProvider } from './components/WhiteboardHotkeysProvider';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from './lib/testUtils/documentTestUtils';
import { mockPowerLevelsEvent } from './lib/testUtils/matrixTestUtils';
import { WhiteboardManager } from './state';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('App', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager());

    Wrapper = ({ children }) => (
      <WhiteboardHotkeysProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <LayoutStateProvider>
            <GuidedTourProvider>
              <SnackbarProvider>{children}</SnackbarProvider>
            </GuidedTourProvider>
          </LayoutStateProvider>
        </WhiteboardTestingContextProvider>
      </WhiteboardHotkeysProvider>
    );
  });

  it('should show wait for moderator message', async () => {
    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          users_default: 0,
          users: {
            '@moderator-user:example.com': 50,
          },
        },
      }),
    );

    render(<App />, { wrapper: Wrapper });

    const message = await screen.findByRole('progressbar', {
      name: /wait for the moderator to join/i,
    });
    expect(message).toBeInTheDocument();

    // grant user rights to create whiteboard
    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          users_default: 0,
          users: {
            '@moderator-user:example.com': 50,
            '@user-id:example.com': 50,
          },
        },
      }),
    );

    await waitFor(() => {
      expect(message).not.toBeInTheDocument();
    });
  });
});
