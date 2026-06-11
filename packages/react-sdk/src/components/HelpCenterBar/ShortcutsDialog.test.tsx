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

import { render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { isMacOS } from '../common/platform';
import { ShortcutsDialog } from './ShortcutsDialog';

vi.mock('../common/platform');

describe('<ShortcutsDialog/>', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.mocked(isMacOS).mockReturnValue(false);
  });

  it('should render the dialog without exploding', () => {
    render(<ShortcutsDialog open onClose={onClose} />);

    expect(
      screen.getByRole('dialog', { name: 'Keyboard shortcuts' }),
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<ShortcutsDialog open onClose={onClose} />);

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should render all shortcut entries', () => {
    render(<ShortcutsDialog open onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });

    expect(within(dialog).getAllByTestId('shortcut-entry')).toHaveLength(10);
    expect(within(dialog).getAllByTestId('shortcut-chip')).toHaveLength(10);
  });

  it('should render shortcut labels', () => {
    render(<ShortcutsDialog open onClose={onClose} />);

    expect(screen.getByText('Undo')).toBeInTheDocument();
    expect(screen.getByText('Redo')).toBeInTheDocument();
    expect(screen.getByText('Unselect')).toBeInTheDocument();
    expect(
      screen.getByText('Move element(s) on the board'),
    ).toBeInTheDocument();
  });

  it('should use Ctrl modifier on Windows/Linux', () => {
    render(<ShortcutsDialog open onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });

    expect(within(dialog).getAllByText('Ctrl').length).toBeGreaterThan(0);
    expect(within(dialog).queryByText('⌘')).not.toBeInTheDocument();
  });

  it('should use ⌘ modifier on macOS', () => {
    vi.mocked(isMacOS).mockReturnValue(true);

    render(<ShortcutsDialog open onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });

    expect(within(dialog).getAllByText('⌘').length).toBeGreaterThan(0);
    expect(within(dialog).queryByText('Ctrl')).not.toBeInTheDocument();
  });

  it('should show Y as the redo key on Windows/Linux', () => {
    render(<ShortcutsDialog open onClose={onClose} />);

    // Y is unique to the redo shortcut on Windows/Linux
    expect(screen.getByText('Y')).toBeInTheDocument();
  });

  it('should not show Y for redo on macOS', () => {
    vi.mocked(isMacOS).mockReturnValue(true);

    render(<ShortcutsDialog open onClose={onClose} />);
    expect(screen.queryByText('Y')).not.toBeInTheDocument();
  });
});
