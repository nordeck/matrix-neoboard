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

import { act, renderHook } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { SnackbarProvider } from '../Snackbar';
import { ConnectionStateProvider } from './ConnectionStateProvider';
import { useConnectionState } from './useConnectionState';

describe('<ConnectionStateProvider />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    Wrapper = ({ children }: PropsWithChildren<{}>) => (
      <SnackbarProvider>
        <ConnectionStateProvider>{children}</ConnectionStateProvider>
      </SnackbarProvider>
    );
  });

  it('should have connectionState "online", if navigator is onLine', () => {
    const { result } = renderHook(useConnectionState, { wrapper: Wrapper });
    expect(result.current.connectionState).toBe('online');
  });

  it('should have connectionState "no_internet_connection" when navigator goes offline', async () => {
    const { result } = renderHook(useConnectionState, {
      wrapper: Wrapper,
    });

    // @ts-ignore forcefully set in test
    window.navigator.onLine = false;

    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(result.current.connectionState).toBe('no_internet_connection');
  });

  it('should have connectionState "online" when navigator goes online', async () => {
    // @ts-ignore forcefully set in test
    window.navigator.onLine = false;

    const { result } = renderHook(useConnectionState, {
      wrapper: Wrapper,
    });

    // @ts-ignore forcefully set in test
    window.navigator.onLine = true;

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(result.current.connectionState).toBe('online');
  });
});
