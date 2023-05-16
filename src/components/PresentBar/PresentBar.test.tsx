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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils/documentTestUtils';
import { mockRoomMember } from '../../lib/testUtils/matrixTestUtils';
import { WhiteboardManager } from '../../state';
import { PresentBar } from './PresentBar';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<PresentBar/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  let setPresentationMode: (enable: boolean) => void;

  beforeEach(() => {
    ({ whiteboardManager, setPresentationMode } = mockWhiteboardManager());

    widgetApi.mockSendStateEvent(mockRoomMember());

    Wrapper = ({ children }) => (
      <WhiteboardTestingContextProvider
        whiteboardManager={whiteboardManager}
        widgetApi={widgetApi}
      >
        {children}
      </WhiteboardTestingContextProvider>
    );
  });

  it('should render without exploding', () => {
    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    expect(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      })
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<PresentBar />, { wrapper: Wrapper });

    expect(
      screen.getByRole('checkbox', { name: 'Start presentation' })
    ).toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('should have no accessibility violations when viewing a presentation', async () => {
    setPresentationMode(true);

    const { container } = render(<PresentBar />, { wrapper: Wrapper });

    expect(
      await screen.findByRole('button', { name: 'Alice is presenting' })
    ).toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('should start the presentation', async () => {
    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      })
    );

    expect(
      within(toolbar).getByRole('checkbox', {
        name: 'Stop presentation',
        checked: true,
      })
    ).toBeInTheDocument();
  });

  it('should stop the presentation', async () => {
    whiteboardManager
      .getActiveWhiteboardInstance()
      ?.getPresentationManager()
      .startPresentation();

    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'Stop presentation',
        checked: true,
      })
    );

    expect(
      within(toolbar).getByRole('checkbox', {
        name: 'Start presentation',
        checked: false,
      })
    ).toBeInTheDocument();
  });

  it('should show the active presenter', async () => {
    setPresentationMode(true);

    render(<PresentBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Present' });

    expect(
      await within(toolbar).findByRole('button', {
        name: 'Alice is presenting',
      })
    ).toBeInTheDocument();
  });
});
