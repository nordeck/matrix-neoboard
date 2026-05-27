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
      name: 'Slides are now Frames',
      description:
        'Your existing Slides will now be shown as Frames - a new way to organize your content. Please download a copy of your whiteboard before continuing.',
    });

    expect(
      within(dialog).getByRole('heading', { name: 'Slides are now Frames' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'Your existing Slides will now be shown as Frames - a new way to organize your content. Please download a copy of your whiteboard before continuing.',
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Download' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Continue' }),
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
      name: 'Upgrade required',
      description:
        'This whiteboard requires a more recent version of NeoBoard that uses Frames instead of Slides.',
    });

    expect(
      within(dialog).getByRole('heading', { name: 'Upgrade required' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        'This whiteboard requires a more recent version of NeoBoard that uses Frames instead of Slides.',
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Download' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole('button', { name: 'Continue' }),
    ).not.toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <SlidesMigrationDialog open canUpdate onUpdate={onUpdate} />,
    );

    await screen.findByRole('dialog', {
      name: 'Slides are now Frames',
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should have no accessibility violations if cannot update', async () => {
    const { container } = render(
      <SlidesMigrationDialog open canUpdate={false} onUpdate={onUpdate} />,
    );

    await screen.findByRole('dialog', {
      name: 'Upgrade required',
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should render update button disabled if update is disabled', () => {
    render(
      <SlidesMigrationDialog open canUpdate isLoading onUpdate={onUpdate} />,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Slides are now Frames',
    });

    expect(
      within(dialog).getByRole('button', { name: 'Continue' }),
    ).toBeDisabled();
  });

  it('should render update button disabled while loading', async () => {
    render(
      <SlidesMigrationDialog open canUpdate isLoading onUpdate={onUpdate} />,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Slides are now Frames',
    });

    expect(
      within(dialog).getByRole('button', { name: 'Continue' }),
    ).toBeDisabled();
  });

  it('should have no accessibility violations while loading', async () => {
    const { container } = render(
      <SlidesMigrationDialog open canUpdate isLoading onUpdate={onUpdate} />,
    );

    await screen.findByRole('dialog', {
      name: 'Slides are now Frames',
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should render error', async () => {
    render(
      <SlidesMigrationDialog open canUpdate isError onUpdate={onUpdate} />,
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Slides are now Frames',
    });

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText(
        'An issue occurred when moving Slides into Frames',
      ),
    ).toBeInTheDocument();

    expect(
      within(dialog).getByRole('button', { name: 'Continue' }),
    ).toBeDisabled();
  });

  it('should update on update button click', async () => {
    render(<SlidesMigrationDialog open canUpdate onUpdate={onUpdate} />);

    const dialog = await screen.findByRole('dialog', {
      name: 'Slides are now Frames',
    });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Continue' }),
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
      name: 'Slides are now Frames',
    });

    expect(
      within(dialog).getByRole('button', { name: 'Continue' }),
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
      name: 'Upgrade required',
    });

    expect(
      within(dialog).queryByRole('button', { name: 'Continue' }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', {
        name: 'Go Back',
      }),
    ).toBeInTheDocument();
  });
});
