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
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils/documentTestUtils';
import { mockRoomName } from '../../lib/testUtils/matrixTestUtils';
import { WhiteboardManager } from '../../state';
import { LayoutStateProvider } from '../Layout';
import { ExportWhiteboardDialog } from './ExportWhiteboardDialog';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<ExportWhiteboardDialog/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  const onClose = jest.fn();

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

    jest.mocked(URL.createObjectURL).mockReturnValue('blob:url');
  });

  it('should render without exploding', async () => {
    render(<ExportWhiteboardDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog', {
      name: 'Export the content',
      description:
        'Download a copy of your content. You can import the file into a different room with the import feature.',
    });

    expect(
      within(dialog).getByRole('button', { name: 'Cancel' })
    ).toHaveFocus();
    expect(
      within(dialog).getByRole('button', { name: 'Close' })
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('link', { name: 'Download' })
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { baseElement } = render(
      <ExportWhiteboardDialog open onClose={onClose} />,
      { wrapper: Wrapper }
    );

    expect(screen.getByRole('link', { name: 'Download' })).toBeInTheDocument();

    // the popover is opened in a portal, so we check the baseElement, i.e. <body/>.
    expect(await axe(baseElement)).toHaveNoViolations();
  });

  it('should close dialog on close', async () => {
    render(<ExportWhiteboardDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Close' })
    );

    expect(onClose).toBeCalled();
  });

  it('should close dialog on cancel', async () => {
    render(<ExportWhiteboardDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Cancel' })
    );

    expect(onClose).toBeCalled();
  });

  it('should close dialog on download', async () => {
    render(<ExportWhiteboardDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog');

    await userEvent.click(
      within(dialog).getByRole('link', { name: 'Download' })
    );

    expect(onClose).toBeCalled();
  });

  it('should provide download button', async () => {
    render(<ExportWhiteboardDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog');

    const downloadButton = within(dialog).getByRole('link', {
      name: 'Download',
    });

    expect(downloadButton).toHaveAttribute('href', 'blob:url');
    expect(downloadButton).toHaveAttribute('download', 'NeoBoard.nwb');
  });

  it('should use the room name for the file name', async () => {
    widgetApi.mockSendStateEvent(mockRoomName());

    render(<ExportWhiteboardDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog');

    const downloadButton = within(dialog).getByRole('link', {
      name: 'Download',
    });

    await waitFor(() => {
      expect(downloadButton).toHaveAttribute('download', 'My Room.nwb');
    });
  });

  it('should download the correct whiteboard content', async () => {
    const blobSpy = jest.spyOn(global, 'Blob').mockReturnValue({
      size: 0,
      type: '',
      arrayBuffer: jest.fn(),
      slice: jest.fn(),
      stream: jest.fn(),
      text: jest.fn(),
    });

    widgetApi.mockSendStateEvent(mockRoomName());

    render(<ExportWhiteboardDialog open onClose={onClose} />, {
      wrapper: Wrapper,
    });

    expect(blobSpy).toBeCalledWith([
      '{"version":"net.nordeck.whiteboard@v1","whiteboard":{"slides":[{"elements":[{"type":"shape","kind":"ellipse","position":{"x":0,"y":1},"fillColor":"#ffffff","height":100,"width":50,"text":""}]}]}}',
    ]);
  });
});
