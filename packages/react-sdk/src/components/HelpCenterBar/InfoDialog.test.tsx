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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { MenuList } from '@mui/material';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InfoDialog } from './InfoDialog';

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

describe('<InfoDialog/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  const onClose = vi.fn();

  beforeEach(() => {
    vi.mocked(getEnvironment).mockImplementation(
      (_, defaultValue) => defaultValue,
    );

    Wrapper = ({ children }) => <MenuList>{children}</MenuList>;
  });

  it('should render without exploding', async () => {
    render(<InfoDialog open onClose={onClose} />, { wrapper: Wrapper });

    const dialog = screen.getByRole('dialog', {
      name: 'About NeoBoard',
      description: 'Version unset',
    });

    expect(
      within(dialog).getByRole('heading', { name: 'About NeoBoard' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Version unset')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Show more' }),
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<InfoDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should show the configured version and revision', async () => {
    vi.mocked(getEnvironment).mockImplementation(
      (name: string, defaultValue: string) => {
        switch (name) {
          case 'REACT_APP_VERSION':
            return '1.0.0';
          case 'REACT_APP_REVISION':
            return '8070e9546f2f13732cd8db0bd29b4b61d9abc70e';
          default:
            return defaultValue;
        }
      },
    );

    render(<InfoDialog open onClose={onClose} />, { wrapper: Wrapper });

    const dialog = screen.getByRole('dialog', {
      name: 'About NeoBoard',
      description: 'Version 1.0.0',
    });

    expect(
      within(dialog).getByRole('heading', { name: 'About NeoBoard' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText('Version 1.0.0')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Show more' }));

    const revisionTextBox = within(dialog).getByRole('textbox', {
      name: 'Commit hash',
    });

    expect(revisionTextBox).toHaveValue(
      '8070e9546f2f13732cd8db0bd29b4b61d9abc70e',
    );

    await userEvent.click(screen.getByRole('button', { name: 'Show less' }));

    expect(revisionTextBox).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole('button', { name: 'Close' })[0]);
  });

  it('should close the dialog on click', async () => {
    render(<InfoDialog open onClose={onClose} />, { wrapper: Wrapper });

    await userEvent.click(screen.getAllByRole('button', { name: 'Close' })[1]);

    expect(onClose).toHaveBeenCalled();
  });
});
