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

import { act, render, screen } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { SnackbarProvider, SnackbarState } from './SnackbarProvider';
import { useSnackbar } from './useSnackbar';

describe('<SnackbarProvider />', () => {
  let snackbarContextState: SnackbarState;
  let SnackbarProviderTest: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    function SnackbarStateExtractor() {
      snackbarContextState = useSnackbar();
      return null;
    }

    SnackbarProviderTest = () => {
      return (
        <SnackbarProvider>
          <SnackbarStateExtractor />
        </SnackbarProvider>
      );
    };
  });

  it('should provide a snackbar', () => {
    render(<SnackbarProviderTest />);

    act(() => {
      snackbarContextState.showSnackbar({
        key: 'testSnackbar',
        message: 'test snackbar',
      });
    });

    expect(screen.getByText('test snackbar')).toBeInTheDocument();
  });
});
