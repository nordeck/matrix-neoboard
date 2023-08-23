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
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
import { GuidedTourProvider, useGuidedTour } from '../GuidedTour';
import { HelpCenterBar } from './HelpCenterBar';

jest.mock('@matrix-widget-toolkit/mui', () => ({
  ...jest.requireActual('@matrix-widget-toolkit/mui'),
  getEnvironment: jest.fn(),
}));

function TestComponent() {
  const { isRunning } = useGuidedTour();
  return <p>Tour running: {isRunning ? 'YES' : 'NO'}</p>;
}

describe('<HelpCenterBar/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    jest
      .mocked(getEnvironment)
      .mockImplementation((_, defaultValue) => defaultValue);

    Wrapper = ({ children }) => (
      <GuidedTourProvider>
        {children}
        <TestComponent />
      </GuidedTourProvider>
    );
  });

  it('should render without exploding', async () => {
    render(<HelpCenterBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Help center' });

    await userEvent.click(
      within(toolbar).getByRole('button', { name: 'Help' })
    );

    const menu = screen.getByRole('menu', { name: 'Help' });

    expect(
      within(menu).getByRole('menuitem', { name: 'Reset onboarding' })
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: 'About NeoBoard' })
    ).toBeInTheDocument();
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(2);

    await userEvent.keyboard('[Escape]');

    expect(menu).not.toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<HelpCenterBar />, { wrapper: Wrapper });

    expect(await axe(container)).toHaveNoViolations();
  });

  it('should provide anchor for the guided tour', () => {
    render(<HelpCenterBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Help center' });

    expect(toolbar).toHaveAttribute('data-guided-tour-target', 'helpcenterbar');
  });

  it('should open the help center and close the menu', async () => {
    jest
      .mocked(getEnvironment)
      .mockImplementation((name, defaultValue) =>
        name === 'REACT_APP_HELP_CENTER_URL'
          ? 'https://example.com'
          : defaultValue
      );
    render(<HelpCenterBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Help center' });

    await userEvent.click(
      within(toolbar).getByRole('button', { name: 'Help' })
    );

    const menu = screen.getByRole('menu', { name: 'Help' });
    const helpCenterButton = screen.getByRole('menuitem', {
      name: 'Help Center',
    });

    expect(helpCenterButton).toHaveAttribute('href', 'https://example.com');

    await userEvent.click(helpCenterButton);

    expect(menu).not.toBeInTheDocument();
  });

  it('should open the about dialog and close the menu', async () => {
    render(<HelpCenterBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Help center' });

    await userEvent.click(
      within(toolbar).getByRole('button', { name: 'Help' })
    );

    const menu = screen.getByRole('menu', { name: 'Help' });

    await userEvent.click(
      screen.getByRole('menuitem', { name: 'About NeoBoard' })
    );

    const dialog = screen.getByRole('dialog', { name: 'About NeoBoard' });

    await userEvent.click(
      within(dialog).getAllByRole('button', { name: 'Close' })[0]
    );

    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });
    expect(menu).not.toBeInTheDocument();
  });

  it('should only show the help center if the URL is configured', async () => {
    jest
      .mocked(getEnvironment)
      .mockImplementation((name, defaultValue) =>
        name === 'REACT_APP_HELP_CENTER_URL'
          ? 'https://example.com'
          : defaultValue
      );

    const { rerender } = render(<HelpCenterBar />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole('button', { name: 'Help' }));

    const menu = screen.getByRole('menu', { name: 'Help' });
    const helpCenter = within(menu).queryByRole('menuitem', {
      name: 'Help Center',
    });

    // rerender after disabling the config
    jest
      .mocked(getEnvironment)
      .mockImplementation((_, defaultValue) => defaultValue);
    rerender(<HelpCenterBar />);

    expect(helpCenter).not.toBeInTheDocument();
  });

  it('should reset the onboarding', async () => {
    localStorage.setItem('guided_tour_completed', 'true');

    render(<HelpCenterBar />, { wrapper: Wrapper });

    expect(screen.getByText('Tour running: NO')).toBeInTheDocument();

    const toolbar = screen.getByRole('toolbar', { name: 'Help center' });
    const menuSettingsMenu = within(toolbar).getByRole('button', {
      name: 'Help',
    });
    await userEvent.click(menuSettingsMenu);

    const menu = screen.getByRole('menu', { name: 'Help' });
    const button = screen.getByRole('menuitem', {
      name: 'Reset onboarding',
    });

    await userEvent.click(button);

    expect(screen.getByText('Tour running: YES')).toBeInTheDocument();

    expect(menu).not.toBeInTheDocument();
  });
});
