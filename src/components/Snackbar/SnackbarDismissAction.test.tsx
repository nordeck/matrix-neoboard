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

import { Snackbar } from '@mui/material';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType, PropsWithChildren } from 'react';
import { SnackbarDismissAction } from './SnackbarDismissAction';
import { SnackbarProvider, SnackbarState } from './SnackbarProvider';
import { useSnackbar } from './useSnackbar';

describe('<SnackbarDismissAction />', () => {
  let snackbarState: SnackbarState;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    function SnackbarStateExtractor() {
      snackbarState = useSnackbar();
      jest.spyOn(snackbarState, 'clearSnackbar');
      return null;
    }
    Wrapper = ({ children }: PropsWithChildren<{}>) => (
      <SnackbarProvider>
        <SnackbarStateExtractor />
        {children}
      </SnackbarProvider>
    );
  });

  it('should provide a dismiss action that clears the snackbar', async () => {
    render(
      <Snackbar
        key="testSnackbar"
        message="test snackbar"
        action={<SnackbarDismissAction />}
        open={true}
      />,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(snackbarState.clearSnackbar).toHaveBeenCalled();
  });
});
