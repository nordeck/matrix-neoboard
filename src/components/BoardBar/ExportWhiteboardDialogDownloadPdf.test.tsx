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
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
import { NEVER, of, throwError } from 'rxjs';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { mockRoomName } from '../../lib/testUtils/matrixTestUtils';
import { WhiteboardManager } from '../../state';
import { ExportWhiteboardDialogDownloadPdf } from './ExportWhiteboardDialogDownloadPdf';
import { createWhiteboardPdf } from './pdf';

// The pdf library doesn't work in test, so we mock pdf generation completely
jest.mock('./pdf', () => ({ createWhiteboardPdf: jest.fn() }));

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<ExportWhiteboardDialogDownloadPdf />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  const onClick = jest.fn();

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

    jest.mocked(URL.createObjectURL).mockReturnValue('blob:url');
    jest.mocked(createWhiteboardPdf).mockReturnValue(of(new Blob(['value'])));
  });

  it('should render without exploding', async () => {
    render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper }
    );

    expect(
      await screen.findByRole('link', {
        name: 'Download',
        description: /not accessible/i,
      })
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper }
    );

    expect(
      await screen.findByRole('link', { name: 'Download' })
    ).toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('should emit onClick on download', async () => {
    render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper }
    );

    await userEvent.click(screen.getByRole('link', { name: 'Download' }));

    expect(onClick).toBeCalled();
  });

  it('should provide download button', async () => {
    render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper }
    );

    const downloadButton = screen.getByRole('link', { name: 'Download' });

    expect(downloadButton).toHaveAttribute('href', 'blob:url');
    expect(downloadButton).toHaveAttribute('download', 'NeoBoard.pdf');
  });

  it('should use the room name for the file name', async () => {
    widgetApi.mockSendStateEvent(mockRoomName());

    render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper }
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
      { wrapper: Wrapper }
    );

    expect(createWhiteboardPdf).toBeCalledTimes(1);
    expect(createWhiteboardPdf).toBeCalledWith({
      authorName: '@user-id',
      roomName: 'NeoBoard',
      whiteboardInstance: whiteboardManager.getActiveWhiteboardInstance(),
    });
  });

  it('should revoke URL on unload', async () => {
    const { unmount } = render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper }
    );

    const link = await screen.findByRole('link', { name: 'Download' });
    expect(link).toHaveAttribute('href', 'blob:url');

    unmount();

    expect(URL.revokeObjectURL).toBeCalledWith('blob:url');
  });

  it('should handle error while generating PDF', async () => {
    jest
      .mocked(createWhiteboardPdf)
      .mockReturnValue(throwError(() => new Error('Failed')));

    const onError = jest.fn();

    render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick} onError={onError}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper }
    );

    expect(onError).toBeCalledWith(
      'Something went wrong while generating the PDF.'
    );
  });

  it('should show loading state', () => {
    jest.mocked(createWhiteboardPdf).mockReturnValue(NEVER);

    render(
      <ExportWhiteboardDialogDownloadPdf onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadPdf>,
      { wrapper: Wrapper }
    );

    expect(
      screen.getByRole('progressbar', { name: 'Download' })
    ).toBeInTheDocument();
  });
});
