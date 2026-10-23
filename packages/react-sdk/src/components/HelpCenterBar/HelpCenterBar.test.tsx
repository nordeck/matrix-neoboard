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
import axe from 'axe-core';
import i18next, { i18n as _i18n } from 'i18next';
import { ComponentType, PropsWithChildren } from 'react';
import { I18nextProvider } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GuidedTourProvider, useGuidedTour } from '../GuidedTour';
import { HelpCenterBar } from './HelpCenterBar';

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

// The instance is passed via I18nextProvider and not registered globally with
// initReactI18next, so the other tests keep using the default instance
function setupI18n(instance: _i18n) {
  instance.init({
    lng: 'de',
    resources: {
      de: {
        neoboard: {
          helpCenter: {
            menu: {
              userGuide: 'Handbuch',
            },
          },
        },
      },
    },
  });
  return instance;
}

function TestComponent() {
  const { isRunning } = useGuidedTour();
  return <p>Tour running: {isRunning ? 'YES' : 'NO'}</p>;
}

describe('<HelpCenterBar/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    vi.mocked(getEnvironment).mockImplementation(
      (_, defaultValue) => defaultValue,
    );

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
      within(toolbar).getByRole('button', { name: 'Help' }),
    );

    const menu = screen.getByRole('menu', { name: 'Help' });

    expect(
      within(menu).getByRole('menuitem', { name: 'Reset onboarding' }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: 'Keyboard shortcuts' }),
    ).toBeInTheDocument();
    expect(
      within(menu).getByRole('menuitem', { name: 'About NeoBoard' }),
    ).toBeInTheDocument();
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(3);

    await userEvent.keyboard('[Escape]');

    await waitFor(() => {
      expect(menu).not.toBeInTheDocument();
    });
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<HelpCenterBar />, { wrapper: Wrapper });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should provide anchor for the guided tour', () => {
    render(<HelpCenterBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Help center' });

    expect(toolbar).toHaveAttribute('data-guided-tour-target', 'helpcenterbar');
  });

  it('should open the help center and close the menu', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_HELP_CENTER_URL_EN'
        ? 'https://example.com'
        : defaultValue,
    );
    render(<HelpCenterBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Help center' });

    await userEvent.click(
      within(toolbar).getByRole('button', { name: 'Help' }),
    );

    const menu = screen.getByRole('menu', { name: 'Help' });
    const helpCenterButton = screen.getByRole('menuitem', {
      name: 'User guide',
    });

    expect(helpCenterButton).toHaveAttribute('href', 'https://example.com');
    expect(helpCenterButton).toHaveAttribute('target', '_blank');
    expect(helpCenterButton).toHaveAttribute('rel', 'noopener noreferrer');

    await userEvent.click(helpCenterButton);

    await waitFor(() => {
      expect(menu).not.toBeInTheDocument();
    });
  });

  it('should link to the manual in the selected language', async () => {
    vi.mocked(getEnvironment).mockImplementation(
      (name: string, defaultValue: string) => {
        switch (name) {
          case 'REACT_APP_HELP_CENTER_URL_EN':
            return 'https://example.com/user-guide.pdf';
          case 'REACT_APP_HELP_CENTER_URL_DE':
            return 'https://example.com/handbuch.pdf';
          default:
            return defaultValue;
        }
      },
    );

    const i18n = setupI18n(i18next.createInstance());

    render(
      <I18nextProvider i18n={i18n}>
        <HelpCenterBar />
      </I18nextProvider>,
      { wrapper: Wrapper },
    );

    const toolbar = screen.getByRole('toolbar', { name: 'Help center' });

    await userEvent.click(
      within(toolbar).getByRole('button', { name: 'Help' }),
    );

    expect(screen.getByRole('menuitem', { name: 'Handbuch' })).toHaveAttribute(
      'href',
      'https://example.com/handbuch.pdf',
    );
  });

  it('should open the about dialog and close the menu', async () => {
    render(<HelpCenterBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Help center' });

    await userEvent.click(
      within(toolbar).getByRole('button', { name: 'Help' }),
    );

    const menu = screen.getByRole('menu', { name: 'Help' });

    await userEvent.click(
      screen.getByRole('menuitem', { name: 'About NeoBoard' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'About NeoBoard' });

    await userEvent.click(
      within(dialog).getAllByRole('button', { name: 'Close' })[0],
    );

    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });
    expect(menu).not.toBeInTheDocument();
  });

  it('should open the shortcuts dialog and close the menu', async () => {
    render(<HelpCenterBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Help center' });

    await userEvent.click(
      within(toolbar).getByRole('button', { name: 'Help' }),
    );

    const menu = screen.getByRole('menu', { name: 'Help' });

    await userEvent.click(
      screen.getByRole('menuitem', { name: 'Keyboard shortcuts' }),
    );

    const dialog = screen.getByRole('dialog', { name: 'Keyboard shortcuts' });

    await userEvent.click(within(dialog).getByTestId('shortcuts-dialog-close'));

    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });
    expect(menu).not.toBeInTheDocument();
  });

  it('should only show the help center if the URL is configured', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_HELP_CENTER_URL_EN'
        ? 'https://example.com'
        : defaultValue,
    );

    const { rerender } = render(<HelpCenterBar />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole('button', { name: 'Help' }));

    const menu = screen.getByRole('menu', { name: 'Help' });
    const helpCenter = within(menu).getByRole('menuitem', {
      name: 'User guide',
    });

    expect(helpCenter).toBeInTheDocument();

    // rerender after disabling the config
    vi.mocked(getEnvironment).mockImplementation(
      (_, defaultValue) => defaultValue,
    );
    rerender(<HelpCenterBar />);

    expect(helpCenter).not.toBeInTheDocument();
  });

  it('should reset the onboarding', async () => {
    localStorage.setItem('guided_tour_completed', 'true');

    render(<HelpCenterBar />, { wrapper: Wrapper });

    expect(screen.getByText('Tour running: NO')).toBeInTheDocument();

    const toolbar = await screen.findByRole('toolbar', { name: 'Help center' });
    const menuSettingsMenu = await within(toolbar).findByRole('button', {
      name: 'Help',
    });
    await userEvent.click(menuSettingsMenu);

    const menu = await screen.findByRole('menu', { name: 'Help' });
    const button = await screen.findByRole('menuitem', {
      name: 'Reset onboarding',
    });

    await userEvent.click(button);

    expect(screen.getByText('Tour running: YES')).toBeInTheDocument();

    await waitFor(() => {
      expect(menu).not.toBeInTheDocument();
    });
  });
});
