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
  const onMigrate = vi.fn();

  it('should render without exploding', async () => {
    render(<SlidesMigrationDialog open onMigrate={onMigrate} />);

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
      within(dialog).getByRole('button', { name: 'Migrate' }),
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <SlidesMigrationDialog open onMigrate={onMigrate} />,
    );

    await screen.findByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should render migration button disabled if migration is disabled', () => {
    render(<SlidesMigrationDialog open isLoading onMigrate={onMigrate} />);

    const dialog = screen.getByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    expect(
      within(dialog).getByRole('button', { name: 'Migrate' }),
    ).toBeDisabled();
  });

  it('should render migrate button disabled while loading', async () => {
    render(<SlidesMigrationDialog open isLoading onMigrate={onMigrate} />);

    const dialog = screen.getByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    expect(
      within(dialog).getByRole('button', { name: 'Migrate' }),
    ).toBeDisabled();
  });

  it('should have no accessibility violations while loading', async () => {
    const { container } = render(
      <SlidesMigrationDialog open isLoading onMigrate={onMigrate} />,
    );

    await screen.findByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should render error', async () => {
    render(<SlidesMigrationDialog open isError onMigrate={onMigrate} />);

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

  it('should migrate on migration button click', async () => {
    render(<SlidesMigrationDialog open onMigrate={onMigrate} />);

    const dialog = await screen.findByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Migrate' }),
    );

    expect(onMigrate).toHaveBeenCalled();
  });

  it('should render additional buttons', async () => {
    render(
      <SlidesMigrationDialog
        open
        onMigrate={onMigrate}
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
});
