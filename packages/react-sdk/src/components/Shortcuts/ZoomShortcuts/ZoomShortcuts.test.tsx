/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType, PropsWithChildren } from 'react';
import {
  Mocked,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from '../../../state';
import { zoomStep } from '../../Whiteboard/constants';
import { WhiteboardHotkeysProvider } from '../../WhiteboardHotkeysProvider';
import { ZoomShortcuts } from './ZoomShortcuts';

const mockUpdateScale = vi.fn();

vi.mock('../../Whiteboard/SvgScaleContext', () => {
  return {
    SvgScaleContextProvider: vi.fn(({ children }) => children),
    useSvgScaleContext: vi.fn(() => ({
      updateScale: mockUpdateScale,
    })),
  };
});

describe('ZoomShortcuts', () => {
  let widgetApi: MockedWidgetApi;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;

  beforeEach(() => {
    widgetApi = mockWidgetApi();
    ({ whiteboardManager } = mockWhiteboardManager());

    Wrapper = ({ children }) => (
      <WhiteboardHotkeysProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      </WhiteboardHotkeysProvider>
    );
  });

  afterEach(() => {
    widgetApi.stop();
    // restore the mock on window.navigator.userAgent
    vi.restoreAllMocks();
  });

  it.each([['{Control>}{Plus}'], ['{Control>}{Equal}']])(
    '%s should zoom in',
    async (shortcut) => {
      render(<ZoomShortcuts />, { wrapper: Wrapper });

      await userEvent.keyboard(shortcut);
      expect(mockUpdateScale).toHaveBeenCalledWith(zoomStep);
    },
  );

  it.each([['{Meta>}{Plus}'], ['{Meta>}{Equal}']])(
    '%s should zoom in on mac os',
    async (shortcut) => {
      vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
        'Mac OS (jsdom)',
      );

      render(<ZoomShortcuts />, { wrapper: Wrapper });

      await userEvent.keyboard(shortcut);
      expect(mockUpdateScale).toHaveBeenCalledWith(zoomStep);
    },
  );

  it.each([['{Control>}{Minus}']])('%s should zoom out', async (shortcut) => {
    render(<ZoomShortcuts />, { wrapper: Wrapper });

    await userEvent.keyboard(shortcut);
    expect(mockUpdateScale).toHaveBeenCalledWith(-zoomStep);
  });

  it.each([['{Meta>}{Minus}']])(
    '%s should zoom out on mac os',
    async (shortcut) => {
      vi.spyOn(window.navigator, 'userAgent', 'get').mockReturnValue(
        'Mac OS (jsdom)',
      );

      render(<ZoomShortcuts />, { wrapper: Wrapper });

      await userEvent.keyboard(shortcut);
      expect(mockUpdateScale).toHaveBeenCalledWith(-zoomStep);
    },
  );
});
