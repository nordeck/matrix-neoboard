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
import { SnackbarProvider } from './SnackbarProvider';
import { useSnackbar } from './useSnackbar';

describe('<SnackbarProvider />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    Wrapper = ({ children }: PropsWithChildren<{}>) => (
      <SnackbarProvider>{children}</SnackbarProvider>
    );
  });

  it('should provide snackbar props after showSnackbar', () => {
    const { result } = renderHook(useSnackbar, { wrapper: Wrapper });

    act(() => {
      result.current.showSnackbar({
        key: 'testSnackbar',
        message: 'test snackbar',
      });
    });

    expect(result.current.snackbarProps).toEqual(
      expect.objectContaining({
        key: 'testSnackbar',
        message: 'test snackbar',
      }),
    );
  });

  it('should clear snackbar props after clearSnackbar', () => {
    const { result } = renderHook(useSnackbar, { wrapper: Wrapper });

    act(() => {
      result.current.showSnackbar({
        key: 'testSnackbar',
        message: 'test snackbar',
      });
      result.current.clearSnackbar();
    });

    expect(result.current.snackbarProps).toBeUndefined();
  });
});
