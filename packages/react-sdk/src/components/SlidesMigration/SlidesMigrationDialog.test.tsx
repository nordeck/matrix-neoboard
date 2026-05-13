/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { Button } from '@mui/material';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { describe, expect, it, vi } from 'vitest';
import { SlidesMigrationDialog } from './SlidesMigrationDialog';

describe('<SlidesMigrationDialog/>', () => {
  const onUpdate = vi.fn();

  it('should render without exploding', async () => {
    render(
      <SlidesMigrationDialog
        open
        canUpdate
        onUpdate={onUpdate}
        exportButton={<Button>Download</Button>}
      />,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Migrate slides to frames',
      description:
        'Your existing slides will be migrated to frames. To enable migration, please download a backup of your whiteboard content first.',
    });

    expect(
      within(dialog).getByRole('heading', { name: 'Migrate slides to frames' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Your existing slides will be migrated to frames. To enable migration, please download a backup of your whiteboard content first.',
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Download' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Migrate' }),
    ).toBeInTheDocument();
  });

  it('should render without exploding if cannot update', async () => {
    render(
      <SlidesMigrationDialog
        open
        canUpdate={false}
        onUpdate={onUpdate}
        exportButton={<Button>Download</Button>}
      />,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Upgrade is Required',
      description:
        'A newer version is required to work with the stored document.',
    });

    expect(
      within(dialog).getByRole('heading', { name: 'Upgrade is Required' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'A newer version is required to work with the stored document.',
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Download' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Migrate' }),
    ).not.toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <SlidesMigrationDialog open canUpdate onUpdate={onUpdate} />,
    );

    await screen.findByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should have no accessibility violations if cannot update', async () => {
    const { container } = render(
      <SlidesMigrationDialog open canUpdate={false} onUpdate={onUpdate} />,
    );

    await screen.findByRole('dialog', {
      name: 'Upgrade is Required',
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should render update button disabled if update is disabled', () => {
    render(
      <SlidesMigrationDialog open canUpdate isLoading onUpdate={onUpdate} />,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    expect(
      within(dialog).getByRole('button', { name: 'Migrate' }),
    ).toBeDisabled();
  });

  it('should render update button disabled while loading', async () => {
    render(
      <SlidesMigrationDialog open canUpdate isLoading onUpdate={onUpdate} />,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    expect(
      within(dialog).getByRole('button', { name: 'Migrate' }),
    ).toBeDisabled();
  });

  it('should have no accessibility violations while loading', async () => {
    const { container } = render(
      <SlidesMigrationDialog open canUpdate isLoading onUpdate={onUpdate} />,
    );

    await screen.findByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should render error', async () => {
    render(
      <SlidesMigrationDialog open canUpdate isError onUpdate={onUpdate} />,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText('Failed to migrate the slides'),
    ).toBeInTheDocument();

    expect(
      within(dialog).getByRole('button', { name: 'Migrate' }),
    ).toBeDisabled();
  });

  it('should update on update button click', async () => {
    render(<SlidesMigrationDialog open canUpdate onUpdate={onUpdate} />);

    const dialog = await screen.findByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Migrate' }),
    );

    expect(onUpdate).toHaveBeenCalled();
  });

  it('should render additional buttons', async () => {
    render(
      <SlidesMigrationDialog
        open
        canUpdate
        onUpdate={onUpdate}
        additionalButtons={<Button>Go Back</Button>}
      />,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    expect(
      within(dialog).getByRole('button', { name: 'Migrate' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', {
        name: 'Go Back',
      }),
    ).toBeInTheDocument();
  });

  it('should render additional buttons if cannot update', async () => {
    render(
      <SlidesMigrationDialog
        open
        canUpdate={false}
        onUpdate={onUpdate}
        additionalButtons={<Button>Go Back</Button>}
      />,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Upgrade is Required',
    });

    expect(
      within(dialog).queryByRole('button', { name: 'Migrate' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', {
        name: 'Go Back',
      }),
    ).toBeInTheDocument();
  });
});
