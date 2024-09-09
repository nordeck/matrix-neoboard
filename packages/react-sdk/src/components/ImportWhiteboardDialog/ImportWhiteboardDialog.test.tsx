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
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import {
  Mock,
  Mocked,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardDocumentExport, WhiteboardManager } from '../../state';
import { ImageUploadProvider } from '../ImageUpload';
import { LayoutStateProvider } from '../Layout';
import { SnackbarProvider } from '../Snackbar';
import { ImportWhiteboardDialog } from './ImportWhiteboardDialog';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<ImportWhiteboardDialog/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let onClose: Mock<() => void>;
  let onRetry: Mock<() => void>;
  let data: WhiteboardDocumentExport;

  beforeEach(() => {
    onClose = vi.fn();
    onRetry = vi.fn();
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
          <SnackbarProvider>
            <ImageUploadProvider>
              <LayoutStateProvider>{children}</LayoutStateProvider>
            </ImageUploadProvider>
          </SnackbarProvider>
        </WhiteboardTestingContextProvider>
      );
    };

    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:url');
  });

  it('should render the success mode', async () => {
    render(
      <ImportWhiteboardDialog
        open
        onClose={onClose}
        importedWhiteboard={{ name: 'file.nwb', isError: false, data }}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper },
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Import content',
      description:
        'Selected file: “file.nwb”. Click to select a different file. Caution Your contents will be replaced. This operation is reversible by using “undo”.',
    });

    expect(
      within(dialog).getByRole('button', {
        name: 'Selected file: “file.nwb”. Click to select a different file.',
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    ).toHaveFocus();
    expect(
      within(dialog).getByRole('button', { name: 'Close' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Import' }),
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
      { wrapper: Wrapper },
    );

    const dialog = screen.getByRole('dialog', {
      name: 'Import content',
      description:
        "Selected file: “file.nwb”. Click to select a different file. Error Your file can't be loaded. Please try again by selecting a different file.",
    });

    expect(
      within(dialog).getByRole('button', {
        name: 'Selected file: “file.nwb”. Click to select a different file.',
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Close' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Import' }),
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
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled();

    // the popover is opened in a portal, so we check the baseElement, i.e. <body/>.
    expect(await axe.run(baseElement)).toHaveNoViolations();
  });

  it('should have no accessibility violations in the error mode', async () => {
    const { baseElement } = render(
      <ImportWhiteboardDialog
        open
        importedWhiteboard={{ name: 'file.nwb', isError: true }}
        onClose={onClose}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();

    expect(await axe.run(baseElement)).toHaveNoViolations();
  });

  it('should close dialog on close', async () => {
    render(
      <ImportWhiteboardDialog
        open
        importedWhiteboard={{ name: 'file.nwb', isError: false, data }}
        onClose={onClose}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper },
    );

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close' }),
    );

    expect(onClose).toHaveBeenCalled();
  });

  it('should close dialog on cancel', async () => {
    render(
      <ImportWhiteboardDialog
        open
        importedWhiteboard={{ name: 'file.nwb', isError: false, data }}
        onClose={onClose}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper },
    );

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    );

    expect(onClose).toHaveBeenCalled();
  });

  it('should select a different file', async () => {
    render(
      <ImportWhiteboardDialog
        open
        importedWhiteboard={{ name: 'file.nwb', isError: false, data }}
        onClose={onClose}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper },
    );

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', {
        name: 'Selected file: “file.nwb”. Click to select a different file.',
      }),
    );

    expect(onRetry).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should import the whiteboard', async () => {
    render(
      <ImportWhiteboardDialog
        open
        importedWhiteboard={{ name: 'file.nwb', isError: false, data }}
        onClose={onClose}
        onRetry={onRetry}
      />,
      { wrapper: Wrapper },
    );

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Import' }),
    );

    expect(
      await whiteboardManager
        .getActiveWhiteboardInstance()
        ?.export(mockWidgetApi()),
    ).toEqual(data);

    expect(onClose).toHaveBeenCalled();
  });
});
