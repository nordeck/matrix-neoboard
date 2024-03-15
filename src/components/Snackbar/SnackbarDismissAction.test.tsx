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

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType, PropsWithChildren } from 'react';
import { SnackbarDismissAction } from './SnackbarDismissAction';
import { SnackbarContextState, SnackbarProvider } from './SnackbarProvider';
import { useSnackbar } from './useSnackbar';

describe('<SnackbarDismissAction />', () => {
  let snackbarContextState: SnackbarContextState;
  let SnackbarProviderTest: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    function SnackbarContextValueExtractor() {
      snackbarContextState = useSnackbar();
      return null;
    }

    SnackbarProviderTest = () => {
      return (
        <SnackbarProvider>
          <SnackbarContextValueExtractor />
        </SnackbarProvider>
      );
    };
  });

  it('should provide a dismiss action that clears the snackbar', async () => {
    render(<SnackbarProviderTest />);

    act(() => {
      snackbarContextState.showSnackbar({
        key: 'testSnackbar',
        message: 'test snackbar',
        action: <SnackbarDismissAction />,
      });
    });
    expect(screen.getByText('test snackbar')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    await waitFor(() => {
      expect(screen.queryByText('test snackbar')).not.toBeInTheDocument();
    });
  });
});
