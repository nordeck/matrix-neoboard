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
import { act, renderHook, waitFor } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { Mocked, afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { mockPowerLevelsEvent } from '../../lib/testUtils/matrixTestUtils';
import { WhiteboardManager } from '../../state';
import { usePowerLevels } from './usePowerLevels';

let widgetApi: MockedWidgetApi;
let wrapper: ComponentType<PropsWithChildren<{}>>;

afterEach(() => widgetApi.stop());

let whiteboardManager: Mocked<WhiteboardManager>;
beforeEach(() => {
  ({ whiteboardManager } = mockWhiteboardManager());
  widgetApi = mockWidgetApi();

  wrapper = ({ children }: PropsWithChildren<{ userId?: string }>) => (
    <WhiteboardTestingContextProvider
      whiteboardManager={whiteboardManager}
      widgetApi={widgetApi}
    >
      {children}
    </WhiteboardTestingContextProvider>
  );
});

describe('usePowerLevels', () => {
  it('should have no power while loading', async () => {
    const { result } = renderHook(() => usePowerLevels(), {
      wrapper,
    });

    await act(async () => {
      expect(result.current).toEqual({
        canImportWhiteboard: undefined,
      });
    });
  });

  it('should have power if user is an admin', async () => {
    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          events: {},
          users: {
            '@user-id': 100,
            '@user-id-1': 55,
            '@user-id-2': 25,
            '@user-id-3': 0,
          },
          events_default: 100,
          state_default: 100,
          users_default: 0,
        },
      }),
    );

    const { result } = renderHook(() => usePowerLevels(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        canInitializeWhiteboard: true,
        canImportWhiteboard: true,
        canStopPresentation: true,
      });
    });
  });

  it('should have power if user is a moderator', async () => {
    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          events: {},
          users: {
            '@user-id': 50,
          },
          events_default: 100,
          state_default: 100,
          users_default: 0,
        },
      }),
    );

    const { result } = renderHook(() => usePowerLevels(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        canInitializeWhiteboard: false,
        canImportWhiteboard: true,
        canStopPresentation: true,
      });
    });
  });

  it('should have no power if user is not admin or moderator', async () => {
    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          events: {},
          users: {
            '@user-id': 25,
          },
          events_default: 100,
          state_default: 100,
          users_default: 0,
        },
      }),
    );

    const { result } = renderHook(() => usePowerLevels(), {
      wrapper,
    });

    await waitFor(() => {
      expect(result.current).toEqual({
        canInitializeWhiteboard: false,
        canImportWhiteboard: false,
        canStopPresentation: false,
      });
    });
  });
});
