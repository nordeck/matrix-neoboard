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
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import { NEVER, of, throwError } from 'rxjs';
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
import { mockRoomName } from '../../lib/testUtils/matrixTestUtils';
import { WhiteboardManager } from '../../state';
import { ExportWhiteboardDialogDownloadPdf } from './ExportWhiteboardDialogDownloadPdf';
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

describe('<ExportWhiteboardDialogDownloadPdf />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  const onClick = vi.fn();

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager());

    Wrapper = ({ children }: PropsWithChildren<{}>) => {
      return (
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      );
    };

    vi.mocked(URL.createObjectURL).mockReturnValue('blob:url');
    vi.mocked(pdf.createWhiteboardPdf).mockReturnValue(of(new Blob(['value'])));
  });

  afterEach(() => {
    vi.mocked(pdf.createWhiteboardPdf).mockRestore();
  });

  it('should render without exploding', async () => {
    render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper },
    );

    expect(
      await screen.findByRole('link', {
        name: 'Download',
        description: /not accessible/i,
      }),
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper },
    );

    expect(
      await screen.findByRole('link', { name: 'Download' }),
    ).toBeInTheDocument();

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should emit onClick on download', async () => {
    render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByRole('link', { name: 'Download' }));

    expect(onClick).toHaveBeenCalled();
  });

  it('should provide download button', async () => {
    render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper },
    );

    const downloadButton = screen.getByRole('link', { name: 'Download' });

    await act(async () => {
      expect(downloadButton).toHaveAttribute('href', 'blob:url');
      expect(downloadButton).toHaveAttribute('download', 'NeoBoard.pdf');
    });
  });

  it('should use the room name for the file name', async () => {
    widgetApi.mockSendStateEvent(mockRoomName());

    render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper },
    );

    const downloadButton = screen.getByRole('link', { name: 'Download' });

    await waitFor(() => {
      expect(downloadButton).toHaveAttribute('download', 'My Room.pdf');
    });
  });

  it('should download the correct whiteboard content', async () => {
    render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper },
    );

    await act(async () => {
      expect(pdf.createWhiteboardPdf).toHaveBeenCalledTimes(1);
      expect(pdf.createWhiteboardPdf).toHaveBeenCalledWith({
        authorName: '@user-id',
        roomName: 'NeoBoard',
        widgetApi: widgetApi,
        whiteboardInstance: whiteboardManager.getActiveWhiteboardInstance(),
      });
    });
  });

  it('should revoke URL on unload', async () => {
    const { unmount } = render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper },
    );

    const link = await screen.findByRole('link', { name: 'Download' });
    expect(link).toHaveAttribute('href', 'blob:url');

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:url');
  });

  it('should handle error while generating PDF', () => {
    vi.mocked(pdf.createWhiteboardPdf).mockReturnValue(
      throwError(() => new Error('Failed')),
    );

    const onError = vi.fn();

    const { unmount } = render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick} onError={onError}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper },
    );

    expect(onError).toHaveBeenCalledWith('Failed');

    // unmount to prevent updates after tests
    unmount();
  });

  it('should show loading state', () => {
    vi.mocked(pdf.createWhiteboardPdf).mockReturnValue(NEVER);

    const { unmount } = render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper },
    );

    expect(
      screen.getByRole('progressbar', { name: 'Download' }),
    ).toBeInTheDocument();

    // unmount to prevent updates after tests
    unmount();
  });
});
