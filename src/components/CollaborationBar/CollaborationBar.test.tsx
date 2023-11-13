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
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from '../../state';
import { LayoutStateProvider } from '../Layout';
import { WhiteboardHotkeysProvider } from '../WhiteboardHotkeysProvider';
import { CollaborationBar } from './CollaborationBar';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<CollaborationBar>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  let setPresentationMode: (enable: boolean, enableEdit: boolean) => void;

  beforeEach(() => {
    ({ whiteboardManager, setPresentationMode } = mockWhiteboardManager());

    Wrapper = ({ children }) => (
      <WhiteboardHotkeysProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <LayoutStateProvider>{children}</LayoutStateProvider>
        </WhiteboardTestingContextProvider>
      </WhiteboardHotkeysProvider>
    );
  });

  it('should render without exploding', () => {
    render(<CollaborationBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Collaboration' });

    expect(
      within(toolbar).getByRole('checkbox', {
        name: "Show collaborators' cursors",
        checked: false,
      }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: '@user-id (You)' }),
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<CollaborationBar />, { wrapper: Wrapper });

    expect(await axe(container)).toHaveNoViolations();
  });

  it('should provide anchor for the guided tour', () => {
    render(<CollaborationBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Collaboration' });

    expect(toolbar).toHaveAttribute(
      'data-guided-tour-target',
      'collaborationbar',
    );
  });

  it('should toggle show cursors', async () => {
    render(<CollaborationBar />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: "Show collaborators' cursors",
        checked: false,
      }),
    );

    expect(
      screen.getByRole('checkbox', {
        name: "Hide collaborators' cursors",
        checked: true,
      }),
    ).toBeInTheDocument();
  });

  it('should show cursors in presentation mode if edit mode is enabled', async () => {
    setPresentationMode(true, true);

    render(<CollaborationBar />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: "Show collaborators' cursors",
        checked: false,
      }),
    );

    expect(
      screen.getByRole('checkbox', {
        name: "Hide collaborators' cursors",
        checked: true,
      }),
    ).toBeInTheDocument();
  });

  it('should hide cursors in presentation mode if edit mode is not enabled', async () => {
    render(<CollaborationBar />, { wrapper: Wrapper });

    const toggleCollaboratorsCursors = screen.getByRole('checkbox', {
      name: "Show collaborators' cursors",
      checked: false,
    });

    expect(toggleCollaboratorsCursors).toBeInTheDocument();

    setPresentationMode(true, false);

    expect(toggleCollaboratorsCursors).not.toBeInTheDocument();
  });
});
