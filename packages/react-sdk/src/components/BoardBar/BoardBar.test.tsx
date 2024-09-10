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
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { mockPowerLevelsEvent } from '../../lib/testUtils/matrixTestUtils';
import { WhiteboardDocumentExport, WhiteboardManager } from '../../state';
import { ImageUploadProvider } from '../ImageUpload';
import { ImportWhiteboardDialogProvider } from '../ImportWhiteboardDialog/ImportWhiteboardDialogProvider';
import { LayoutStateProvider } from '../Layout/useLayoutState';
import { SnackbarProvider } from '../Snackbar';
import { BoardBar } from './BoardBar';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<BoardBar/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager());

    Wrapper = ({ children }) => (
      <WhiteboardTestingContextProvider
        whiteboardManager={whiteboardManager}
        widgetApi={widgetApi}
      >
        <SnackbarProvider>
          <ImageUploadProvider>
            <ImportWhiteboardDialogProvider>
              <LayoutStateProvider>{children}</LayoutStateProvider>
            </ImportWhiteboardDialogProvider>
          </ImageUploadProvider>
        </SnackbarProvider>
      </WhiteboardTestingContextProvider>
    );
  });

  it('should render without exploding', async () => {
    render(<BoardBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Board' });

    await act(() => {
      expect(
        within(toolbar).getByRole('checkbox', {
          name: 'Open slide overview',
        }),
      ).toBeInTheDocument();

      expect(
        within(toolbar).getByRole('button', { name: 'Settings' }),
      ).toBeInTheDocument();
    });
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<BoardBar />, { wrapper: Wrapper });

    await act(async () => {
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('should provide anchor for the guided tour', async () => {
    render(<BoardBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Board' });

    await act(() => {
      expect(toolbar).toHaveAttribute('data-guided-tour-target', 'settings');
    });
  });

  it('should toggle the slide overview bar', async () => {
    render(<BoardBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Board' });

    await userEvent.click(
      within(toolbar).getByRole('checkbox', {
        name: 'Open slide overview',
        checked: false,
      }),
    );

    expect(
      within(toolbar).getByRole('checkbox', {
        name: 'Close slide overview',
        checked: true,
      }),
    ).toBeInTheDocument();
  });

  it('should open the settings menu', async () => {
    render(<BoardBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Board' });

    const menuSettingsMenu = within(toolbar).getByRole('button', {
      name: 'Settings',
    });

    await userEvent.click(menuSettingsMenu);

    const settingsMenu = screen.getByRole('menu', {
      name: 'Settings',
    });

    expect(
      within(settingsMenu).getByRole('menuitem', { name: 'Export…' }),
    ).toBeInTheDocument();
    expect(
      within(settingsMenu).getByRole('menuitemcheckbox', { name: 'Grid' }),
    ).toBeInTheDocument();
    expect(
      within(settingsMenu).getByRole('menuitemcheckbox', {
        name: 'Developer Tools',
      }),
    ).toBeInTheDocument();

    await userEvent.keyboard('[Escape]');

    await waitFor(() => {
      expect(settingsMenu).not.toBeInTheDocument();
    });
  });

  it('should open the settings menu and show import button for user with the right power level and not show if no power level', async () => {
    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          events: {},
          users: {
            '@user-id': 100,
          },
          events_default: 100,
          state_default: 100,
          users_default: 0,
        },
      }),
    );
    render(<BoardBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Board' });

    const menuSettingsMenu = within(toolbar).getByRole('button', {
      name: 'Settings',
    });

    await userEvent.click(menuSettingsMenu);

    const settingsMenu = screen.getByRole('menu', {
      name: 'Settings',
    });

    expect(
      within(settingsMenu).getByRole('menuitem', { name: 'Import…' }),
    ).toBeInTheDocument();

    await userEvent.keyboard('[Escape]');

    widgetApi.mockSendStateEvent(
      mockPowerLevelsEvent({
        content: {
          events: {},
          users: {
            '@user-id': 25,
          },
          events_default: 100,
          state_default: 100,
          users_default: 0,
        },
      }),
    );

    await userEvent.click(menuSettingsMenu);

    const settingsMenuNew = screen.getByRole('menu', {
      name: 'Settings',
    });

    expect(
      within(settingsMenuNew).queryByRole('menuitem', { name: 'Import…' }),
    ).not.toBeInTheDocument();
  });

  it('should import a whiteboard', async () => {
    render(<BoardBar />, { wrapper: Wrapper });

    const filePickerInput = screen.getByTestId('import-file-picker');
    expect(filePickerInput).toHaveAttribute(
      'accept',
      'application/octet-stream,.nwb,application/pdf,.pdf',
    );
    expect(filePickerInput).not.toHaveAttribute('multiple');

    const data: WhiteboardDocumentExport = {
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [{ elements: [] }, { elements: [] }, { elements: [] }],
      },
    };

    await userEvent.upload(
      filePickerInput,
      new File([JSON.stringify(data)], 'my-file.nwb', { type: '' }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Import content',
      description:
        'Click to select a different file. Caution Your contents will be replaced. This operation is reversible by using “undo”.',
    });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Import' }),
    );

    expect(
      await whiteboardManager.getActiveWhiteboardInstance()?.export(widgetApi),
    ).toEqual(data);

    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });
  });

  it('should ignore import for an invalid file (with a different file ending)', async () => {
    render(<BoardBar />, { wrapper: Wrapper });

    const data: WhiteboardDocumentExport = {
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [{ elements: [] }, { elements: [] }, { elements: [] }],
      },
    };

    const filePickerInput = screen.getByTestId('import-file-picker');
    await userEvent.upload(
      filePickerInput,
      new File([JSON.stringify(data)], 'my-file.txt', { type: '' }),
      { applyAccept: false },
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'Import content',
      description:
        "Click to select a different file. Error Your file can't be loaded. Please try again by selecting a different file.",
    });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    );

    await waitFor(() => {
      expect(dialog).not.toBeInTheDocument();
    });
  });

  it('should toggle whiteboard grid', async () => {
    render(<BoardBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Board' });

    const menuSettingsMenu = within(toolbar).getByRole('button', {
      name: 'Settings',
    });

    await userEvent.click(menuSettingsMenu);

    const settingsMenu = screen.getByRole('menu', {
      name: 'Settings',
    });

    const gridMenuItem = within(settingsMenu).getByRole('checkbox', {
      name: 'Grid',
      checked: true,
    });

    await userEvent.click(gridMenuItem);

    expect(
      within(settingsMenu).getByRole('checkbox', {
        name: 'Grid',
        checked: false,
      }),
    ).toBeInTheDocument();
  });

  it('should toggle the developer tools', async () => {
    render(<BoardBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Board' });

    const menuSettingsMenu = within(toolbar).getByRole('button', {
      name: 'Settings',
    });

    await userEvent.click(menuSettingsMenu);

    const settingsMenu = screen.getByRole('menu', {
      name: 'Settings',
    });

    const debugMenuItem = within(settingsMenu).getByRole('checkbox', {
      name: 'Developer Tools',
      checked: false,
    });

    await userEvent.click(debugMenuItem);

    expect(debugMenuItem).toBeChecked();
  });
});
