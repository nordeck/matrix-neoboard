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
import { WhiteboardDocumentExport, WhiteboardManager } from '../../state';
import { LayoutStateProvider } from '../Layout';
import { ImportWhiteboardDialog } from './ImportWhiteboardDialog';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<ImportWhiteboardDialog/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  const onClose = jest.fn();
  const onRetry = jest.fn();
  let data: WhiteboardDocumentExport;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager());

    data = {
      version: 'net.nordeck.whiteboard@v1',
      whiteboard: {
        slides: [{ elements: [] }, { elements: [] }, { elements: [] }],
      },
    };

    Wrapper = ({ children }: PropsWithChildren<{}>) => {
      return (
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <LayoutStateProvider>{children}</LayoutStateProvider>
        </WhiteboardTestingContextProvider>
      );
    };

    jest.mocked(URL.createObjectURL).mockReturnValue('blob:url');
  });

  it('should render the success mode', async () => {
    render(
      <ImportWhiteboardDialog
        open
        onClose={onClose}
        importedWhiteboard={{ name: 'file.nwb', isError: false, data }}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper }
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Import content',
      description:
        "Selected file: “file.nwb”. Click to select a different file. Caution Your contents will be replaced. This operation can't be reverted.",
    });

    expect(
      within(dialog).getByRole('button', {
        name: 'Selected file: “file.nwb”. Click to select a different file.',
      })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Cancel' })
    ).toHaveFocus();
    expect(
      within(dialog).getByRole('button', { name: 'Close' })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Import' })
    ).toBeEnabled();
  });

  it('should render the error mode', async () => {
    render(
      <ImportWhiteboardDialog
        open
        onClose={onClose}
        importedWhiteboard={{ name: 'file.nwb', isError: true }}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper }
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Import content',
      description:
        "Selected file: “file.nwb”. Click to select a different file. Error Your file can't be loaded. Please try again by selecting a different file.",
    });

    expect(
      within(dialog).getByRole('button', {
        name: 'Selected file: “file.nwb”. Click to select a different file.',
      })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Cancel' })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Close' })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Import' })
    ).toBeDisabled();
  });

  it('should have no accessibility violations in the success mode', async () => {
    const { baseElement } = render(
      <ImportWhiteboardDialog
        open
        importedWhiteboard={{ name: 'file.nwb', isError: false, data }}
        onClose={onClose}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled();

    // the popover is opened in a portal, so we check the baseElement, i.e. <body/>.
    expect(await axe(baseElement)).toHaveNoViolations();
  });

  it('should have no accessibility violations in the error mode', async () => {
    const { baseElement } = render(
      <ImportWhiteboardDialog
        open
        importedWhiteboard={{ name: 'file.nwb', isError: true }}
        onClose={onClose}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper }
    );

    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();

    expect(await axe(baseElement)).toHaveNoViolations();
  });

  it('should close dialog on close', async () => {
    render(
      <ImportWhiteboardDialog
        open
        importedWhiteboard={{ name: 'file.nwb', isError: false, data }}
        onClose={onClose}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper }
    );

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close' })
    );

    expect(onClose).toBeCalled();
  });

  it('should close dialog on cancel', async () => {
    render(
      <ImportWhiteboardDialog
        open
        importedWhiteboard={{ name: 'file.nwb', isError: false, data }}
        onClose={onClose}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper }
    );

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' })
    );

    expect(onClose).toBeCalled();
  });

  it('should select a different file', async () => {
    render(
      <ImportWhiteboardDialog
        open
        importedWhiteboard={{ name: 'file.nwb', isError: false, data }}
        onClose={onClose}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper }
    );

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', {
        name: 'Selected file: “file.nwb”. Click to select a different file.',
      })
    );

    expect(onRetry).toBeCalled();
    expect(onClose).not.toBeCalled();
  });

  it('should import the whiteboard', async () => {
    render(
      <ImportWhiteboardDialog
        open
        importedWhiteboard={{ name: 'file.nwb', isError: false, data }}
        onClose={onClose}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper }
    );

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Import' })
    );

    expect(whiteboardManager.getActiveWhiteboardInstance()?.export()).toEqual(
      data
    );

    expect(onClose).toBeCalled();
  });
});
