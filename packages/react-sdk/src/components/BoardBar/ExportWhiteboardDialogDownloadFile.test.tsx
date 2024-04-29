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
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { mockRoomName } from '../../lib/testUtils/matrixTestUtils';
import { WhiteboardManager } from '../../state';
import { ExportWhiteboardDialogDownloadFile } from './ExportWhiteboardDialogDownloadFile';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<ExportWhiteboardDialogDownloadFile />', () => {
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
  });

  it('should render without exploding', () => {
    render(
      <ExportWhiteboardDialogDownloadFile onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadFile>,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <ExportWhiteboardDialogDownloadFile onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadFile>,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('should emit onClick on download', async () => {
    render(
      <ExportWhiteboardDialogDownloadFile onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadFile>,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByRole('link', { name: 'Download' }));

    expect(onClick).toBeCalled();
  });

  it('should provide download button', () => {
    render(
      <ExportWhiteboardDialogDownloadFile onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadFile>,
      { wrapper: Wrapper },
    );

    const downloadButton = screen.getByRole('link', { name: 'Download' });

    expect(downloadButton).toHaveAttribute('href', 'blob:url');
    expect(downloadButton).toHaveAttribute('download', 'NeoBoard.nwb');
  });

  it('should use the room name for the file name', async () => {
    widgetApi.mockSendStateEvent(mockRoomName());

    render(
      <ExportWhiteboardDialogDownloadFile onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadFile>,
      { wrapper: Wrapper },
    );

    const downloadButton = screen.getByRole('link', { name: 'Download' });

    await waitFor(() => {
      expect(downloadButton).toHaveAttribute('download', 'My Room.nwb');
    });
  });

  it('should download the correct whiteboard content', () => {
    const blobSpy = jest.spyOn(global, 'Blob').mockReturnValue({
      size: 0,
      type: '',
      arrayBuffer: jest.fn(),
      slice: jest.fn(),
      stream: jest.fn(),
      text: jest.fn(),
    } as unknown as Blob);

    render(
      <ExportWhiteboardDialogDownloadFile onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadFile>,
      { wrapper: Wrapper },
    );

    expect(blobSpy).toBeCalledWith([
      '{"version":"net.nordeck.whiteboard@v1","whiteboard":{"slides":[{"elements":[{"type":"shape","kind":"ellipse","position":{"x":0,"y":1},"fillColor":"#ffffff","height":100,"width":50,"text":""}]}]}}',
    ]);
  });

  it('should revoke URL on unload', async () => {
    const { unmount } = render(
      <ExportWhiteboardDialogDownloadFile onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadFile>,
      { wrapper: Wrapper },
    );

    const link = await screen.findByRole('link', { name: 'Download' });
    expect(link).toHaveAttribute('href', 'blob:url');

    unmount();

    expect(URL.revokeObjectURL).toBeCalledWith('blob:url');
  });
});
