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
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import { of, throwError } from 'rxjs';
import {
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
import { WhiteboardManager } from '../../state';
import { LayoutStateProvider } from '../Layout';
import { ExportWhiteboardDialog } from './ExportWhiteboardDialog';
import * as pdf from './pdf';

// The pdf library doesn't work in test, so we mock pdf generation completely
vi.mock('./pdf', async () => {
  const pdfLib = await vi.importActual<typeof import('./pdf')>('./pdf');
  return {
    ...pdfLib,
    createWhiteboardPdf: vi.fn(),
  };
});

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
  // @ts-ignore forcefully set for tests
  widgetApi.widgetParameters.baseUrl = 'https://example.com';
});

describe('<ExportWhiteboardDialog/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  const onClose = vi.fn();

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager());

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

    vi.mocked(URL.createObjectURL).mockReturnValue('blob:url');
    vi.mocked(pdf.createWhiteboardPdf).mockReturnValue(of(new Blob(['value'])));
  });

  it('should render without exploding', async () => {
    render(<ExportWhiteboardDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog', {
      name: 'Export the content',
      description: 'Please choose your preferred format.',
    });

    await act(async () => {
      expect(
        within(dialog).getByRole('combobox', { name: 'File format' }),
      ).toHaveTextContent('PDF file (.pdf)');

      expect(
        within(dialog).getByRole('button', { name: 'Cancel' }),
      ).toHaveFocus();
      expect(
        within(dialog).getByRole('button', { name: 'Close' }),
      ).toBeInTheDocument();
      expect(
        within(dialog).getByRole('link', { name: 'Download' }),
      ).toBeInTheDocument();
    });
  });

  it('should have no accessibility violations', async () => {
    const { baseElement } = render(
      <ExportWhiteboardDialog open onClose={onClose} />,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument();

    // the popover is opened in a portal, so we check the baseElement, i.e. <body/>.
    await act(async () => {
      expect(await axe.run(baseElement)).toHaveNoViolations();
    });
  });

  it('should close dialog on close', async () => {
    render(<ExportWhiteboardDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close' }),
    );

    expect(onClose).toHaveBeenCalled();
  });

  it('should close dialog on cancel', async () => {
    render(<ExportWhiteboardDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' }),
    );

    expect(onClose).toHaveBeenCalled();
  });

  it('should close dialog on download pdf', async () => {
    render(<ExportWhiteboardDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('link', { name: 'Download' }),
    );

    expect(onClose).toHaveBeenCalled();
  });

  it('should close dialog on download file', async () => {
    render(<ExportWhiteboardDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('combobox', { name: 'File format' }),
    );
    await userEvent.click(
      screen.getByRole('option', { name: 'NeoBoard file (.nwb)' }),
    );

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Download' }),
    );

    expect(onClose).toHaveBeenCalled();
  });

  it('should handle error while generating PDF', async () => {
    vi.mocked(pdf.createWhiteboardPdf).mockReturnValue(
      throwError(() => new Error('Failed')),
    );

    render(<ExportWhiteboardDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    await expect(screen.findByRole('status')).resolves.toHaveTextContent(
      'Something went wrong while generating the PDF.',
    );
  });
});
