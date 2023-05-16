/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { TabPanel } from '@mui/base';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from '../../state';
import { CommunicationChannel } from '../../state/communication';
import { LayoutStateProvider } from '../Layout';
import { SlidesProvider } from '../Layout/SlidesProvider';
import { WhiteboardHotkeysProvider } from '../WhiteboardHotkeysProvider';
import { SlideOverviewBar } from './SlideOverviewBar';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<SideOverviewBar/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  let communicationChannel: jest.Mocked<CommunicationChannel>;

  beforeEach(() => {
    ({ whiteboardManager, communicationChannel } = mockWhiteboardManager({
      slideCount: 3,
    }));

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <WhiteboardHotkeysProvider>
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            <SlidesProvider>
              {children}

              {/* Include tab panels to make accessibility test happy */}
              <TabPanel value="slide-0" />
              <TabPanel value="slide-1" />
              <TabPanel value="slide-2" />
            </SlidesProvider>
          </WhiteboardTestingContextProvider>
        </WhiteboardHotkeysProvider>
      </LayoutStateProvider>
    );
  });

  it('should render without exploding', () => {
    render(<SlideOverviewBar />, { wrapper: Wrapper });

    const nav = screen.getByRole('navigation', { name: 'Slide Overview' });

    expect(
      within(nav).getByRole('button', { name: 'Add slide' })
    ).toBeInTheDocument();

    const tabList = within(nav).getByRole('tablist', { name: 'Slides' });
    const tabs = within(tabList).getAllByRole('tab');

    expect(tabs).toHaveLength(3);

    expect(tabs[0]).toHaveAccessibleName('Slide 1');
    expect(tabs[0]).toHaveAccessibleDescription(
      /Press the M key to start a drag./
    );
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-haspopup', 'menu');

    expect(tabs[1]).toHaveAccessibleName('Slide 2');
    expect(tabs[1]).toHaveAccessibleDescription(
      /Press the M key to start a drag./
    );
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('aria-haspopup', 'menu');

    expect(tabs[2]).toHaveAccessibleName('Slide 3');
    expect(tabs[2]).toHaveAccessibleDescription(
      /Press the M key to start a drag./
    );
    expect(tabs[2]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[2]).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<SlideOverviewBar />, { wrapper: Wrapper });

    expect(await axe(container)).toHaveNoViolations();
  });

  it('should have no accessibility violations for context menu', async () => {
    const { baseElement } = render(<SlideOverviewBar />, { wrapper: Wrapper });

    const tab = screen.getByRole('tab', { name: 'Slide 2' });
    await userEvent.pointer({ keys: '[MouseRight]', target: tab });

    expect(
      await axe(baseElement, {
        rules: {
          // the menu is opened in a portal, so we must check the baseElement,
          // i.e. <body/>. In that case we get false positive warning
          region: { enabled: false },
          // the switch in the checkbox menu item seems to not be allowed, but
          // we accept it for now.
          'nested-interactive': { enabled: false },
        },
      })
    ).toHaveNoViolations();
  });

  it('should provide anchor for the guided tour', () => {
    render(<SlideOverviewBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('navigation', { name: 'Slide Overview' });

    expect(toolbar).toHaveAttribute(
      'data-guided-tour-target',
      'slide-overview'
    );
  });

  it('should add new slide to the list', async () => {
    render(<SlideOverviewBar />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole('button', { name: 'Add slide' }));

    expect(screen.getAllByRole('tab')).toHaveLength(4);
    expect(
      screen.getByRole('tab', { name: 'Slide 4', selected: true })
    ).toBeInTheDocument();
  });

  it('should delete a slide', async () => {
    render(<SlideOverviewBar />, { wrapper: Wrapper });

    const tab = screen.getByRole('tab', { name: 'Slide 2' });
    await userEvent.pointer({ keys: '[MouseRight]', target: tab });

    const menu = screen.getByRole('menu', { name: 'Slide 2' });
    await userEvent.click(
      within(menu).getByRole('menuitem', { name: 'Delete' })
    );
    await waitFor(() => expect(menu).not.toBeInTheDocument());

    expect(screen.getAllByRole('tab')).toHaveLength(2);
  });

  it('should not be able to delete the last slide', async () => {
    ({ whiteboardManager } = mockWhiteboardManager({ slideCount: 1 }));

    render(<SlideOverviewBar />, { wrapper: Wrapper });

    const tab = screen.getByRole('tab', { name: 'Slide 1' });
    await userEvent.pointer({ keys: '[MouseRight]', target: tab });

    const menu = screen.getByRole('menu', { name: 'Slide 1' });

    expect(
      within(menu).getByRole('menuitem', { name: 'Delete' })
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('should not be able to delete a locked slide', async () => {
    whiteboardManager
      .getActiveWhiteboardInstance()
      ?.getSlide('slide-1')
      .lockSlide();

    render(<SlideOverviewBar />, { wrapper: Wrapper });

    const tab = screen.getByRole('tab', { name: 'Slide 2 (locked)' });
    await userEvent.pointer({ keys: '[MouseRight]', target: tab });

    const menu = screen.getByRole('menu', { name: 'Slide 2' });

    expect(
      within(menu).getByRole('menuitem', { name: 'Delete' })
    ).toHaveAttribute('aria-disabled', 'true');
  });

  it('should bring everyone to slide', async () => {
    render(<SlideOverviewBar />, { wrapper: Wrapper });

    const tab = screen.getByRole('tab', { name: 'Slide 2' });
    await userEvent.pointer({ keys: '[MouseRight]', target: tab });

    const menu = screen.getByRole('menu', { name: 'Slide 2' });
    await userEvent.click(
      within(menu).getByRole('menuitem', {
        name: 'Bring all here',
      })
    );
    await waitFor(() => expect(menu).not.toBeInTheDocument());

    expect(communicationChannel.broadcastMessage).toBeCalledWith(
      'net.nordeck.whiteboard.focus_on',
      { slideId: 'slide-1' }
    );
  });

  it('should lock the slide', async () => {
    render(<SlideOverviewBar />, { wrapper: Wrapper });

    const tab = screen.getByRole('tab', { name: 'Slide 2' });
    await userEvent.pointer({ keys: '[MouseRight]', target: tab });

    const menu = screen.getByRole('menu', { name: 'Slide 2' });
    await userEvent.click(
      within(menu).getByRole('menuitemcheckbox', {
        name: 'Lock',
        checked: false,
      })
    );
    await waitFor(() => expect(menu).not.toBeInTheDocument());

    expect(
      screen.getByRole('tab', { name: 'Slide 2 (locked)' })
    ).toBeInTheDocument();
  });

  it('should unlock the slide', async () => {
    whiteboardManager
      .getActiveWhiteboardInstance()
      ?.getSlide('slide-1')
      .lockSlide();

    render(<SlideOverviewBar />, { wrapper: Wrapper });

    const tab = screen.getByRole('tab', { name: 'Slide 2 (locked)' });
    await userEvent.pointer({ keys: '[MouseRight]', target: tab });

    const menu = screen.getByRole('menu', { name: 'Slide 2' });
    await userEvent.click(
      within(menu).getByRole('menuitemcheckbox', {
        name: 'Lock',
        checked: true,
      })
    );
    await waitFor(() => expect(menu).not.toBeInTheDocument());

    expect(screen.getByRole('tab', { name: 'Slide 2' })).toBeInTheDocument();
  });

  it('should select the active slide', async () => {
    render(<SlideOverviewBar />, { wrapper: Wrapper });

    const tab = screen.getByRole('tab', { name: 'Slide 2' });
    await userEvent.click(tab);

    expect(tab).toHaveAttribute('aria-selected', 'true');
  });

  it('should select the active slide via keyboard', async () => {
    render(<SlideOverviewBar />, { wrapper: Wrapper });

    const firstTab = screen.getByRole('tab', {
      name: 'Slide 1',
      selected: true,
    });
    const secondTab = screen.getByRole('tab', {
      name: 'Slide 2',
      selected: false,
    });
    firstTab.focus();

    // Navigating with arrow keys doesn't change the selected tab…
    await userEvent.keyboard('{ArrowDown}');
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
    expect(secondTab).toHaveFocus();

    // … pressing space does
    await userEvent.keyboard('[Space]');
    expect(secondTab).toHaveAttribute('aria-selected', 'true');
    expect(secondTab).toHaveFocus();
  });

  it('should reorder slides via keyboard', async () => {
    const { baseElement } = render(<SlideOverviewBar />, { wrapper: Wrapper });

    const tab = screen.getByRole('tab', {
      name: 'Slide 2',
      selected: false,
      description: /Press the M key to start a drag./,
    });

    tab.focus();
    await userEvent.keyboard('M');

    await waitForAnnouncement(
      baseElement,
      /You have lifted a slide\. It is in position 2 of 3 in the list\./
    );

    await userEvent.keyboard('{ArrowUp}');

    await waitForAnnouncement(
      baseElement,
      'You have moved the slide to position 1 of 3.'
    );

    await userEvent.keyboard('M');

    await waitForAnnouncement(
      baseElement,
      /You have dropped the slide\. It has moved from position 2 to 1\./
    );

    expect(tab).toHaveAccessibleName('Slide 1');

    // Moving the slide should not influence which slide is active
    expect(
      screen.getByRole('tab', { name: 'Slide 2', selected: true })
    ).toBeInTheDocument();
  });

  it('should select the active slide via keyboard after reorder', async () => {
    render(<SlideOverviewBar />, { wrapper: Wrapper });

    const tab = screen.getByRole('tab', { name: 'Slide 1', selected: true });
    tab.focus();

    await userEvent.keyboard('M');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('M');

    const secondTab = screen.getByRole('tab', {
      name: 'Slide 2',
      selected: true,
    });
    const thirdTab = screen.getByRole('tab', {
      name: 'Slide 3',
      selected: false,
    });

    expect(secondTab).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('[Space]');

    expect(thirdTab).toHaveAttribute('aria-selected', 'true');
    expect(thirdTab).toHaveFocus();
  });
});

async function waitForAnnouncement(
  element: HTMLElement,
  message: string | RegExp
) {
  await waitFor(() => {
    expect(
      // We are not able to access an aria-live region via the testing library
      // eslint-disable-next-line testing-library/no-node-access
      element.querySelector('[aria-live=assertive]')
    ).toHaveTextContent(message);
  });
}
