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
import { act, renderHook } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { Provider } from 'react-redux';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from 'vitest';
import { mockWhiteboardManager } from '../../lib/testUtils';
import {
  WhiteboardDocument,
  WhiteboardManager,
  WhiteboardManagerProvider,
} from '../../state';
import { SynchronizedDocument } from '../../state/types';
import { createStore, setSnapshotFailed, StoreType } from '../../store';
import { SnackbarProvider } from '../Snackbar';
import { ConnectionStateProvider } from './ConnectionStateProvider';
import { useConnectionState } from './useConnectionState';

describe('<ConnectionStateProvider />', () => {
  let widgetApi: MockedWidgetApi;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let synchronizedDocument: SynchronizedDocument<WhiteboardDocument>;
  let store: StoreType;

  beforeEach(() => {
    store = createStore({ widgetApi });
    widgetApi = mockWidgetApi();
    ({ synchronizedDocument, whiteboardManager } = mockWhiteboardManager());
    Wrapper = ({ children }: PropsWithChildren<{}>) => (
      <Provider store={store}>
        <WhiteboardManagerProvider whiteboardManager={whiteboardManager}>
          <SnackbarProvider>
            <ConnectionStateProvider>{children}</ConnectionStateProvider>
          </SnackbarProvider>
        </WhiteboardManagerProvider>
      </Provider>
    );
  });

  afterEach(() => {
    vi.useRealTimers();
    widgetApi.stop();
  });

  it('should have connectionState "online", if navigator is onLine', () => {
    const { result } = renderHook(useConnectionState, { wrapper: Wrapper });
    expect(result.current.connectionState).toBe('online');
  });

  it('should have connectionState "no_internet_connection" when navigator goes offline', async () => {
    const { result } = renderHook(useConnectionState, {
      wrapper: Wrapper,
    });

    goOffline();

    expect(result.current.connectionState).toBe('no_internet_connection');
  });

  it('should have connectionState "online" when navigator goes online', async () => {
    // @ts-ignore forcefully set in test
    window.navigator.onLine = false;

    const { result } = renderHook(useConnectionState, {
      wrapper: Wrapper,
    });

    goOnline();

    expect(result.current.connectionState).toBe('online');
  });

  it('should retry snapshots on error', async () => {
    vi.useFakeTimers();

    // Set browser state to offline
    goOffline();

    // Set last snapshot to failed
    store.dispatch(setSnapshotFailed());

    const { result } = renderHook(useConnectionState, { wrapper: Wrapper });

    // There should be no call of persist, yet
    expect(synchronizedDocument.persist).not.toHaveBeenCalled();

    // Let persistence fail
    vi.mocked(synchronizedDocument.persist).mockRejectedValue(new Error());

    // Go online
    goOnline();
    expect(result.current.connectionState).toBe('online');

    // A snapshot should be retried immediately
    expect(synchronizedDocument.persist).toHaveBeenCalledTimes(1);

    // Advance > retry interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });

    // A snapshot should be retried after the interval
    expect(synchronizedDocument.persist).toHaveBeenCalledTimes(2);

    // Let the snapshot succeed
    vi.mocked(synchronizedDocument.persist).mockResolvedValue(undefined);

    // Advance > retry interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });

    // A snapshot should be retried after the interval
    expect(synchronizedDocument.persist).toHaveBeenCalledTimes(3);

    // Store should say snapshot not failed
    expect(store.getState().connectionInfoReducer.snapshotFailed).toBe(false);

    // Advance > retry interval
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_500);
    });

    // There should not be an additional retry call
    expect(synchronizedDocument.persist).toHaveBeenCalledTimes(3);
  });
});

function goOnline() {
  // @ts-ignore forcefully set in test
  window.navigator.onLine = true;

  act(() => {
    window.dispatchEvent(new Event('online'));
  });
}

function goOffline() {
  // @ts-ignore forcefully set in test
  window.navigator.onLine = false;

  act(() => {
    window.dispatchEvent(new Event('offline'));
  });
}
