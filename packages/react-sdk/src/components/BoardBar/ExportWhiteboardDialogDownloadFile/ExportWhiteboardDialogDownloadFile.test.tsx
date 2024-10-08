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
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { mockRoomName } from '../../../lib/testUtils/matrixTestUtils';
import { WhiteboardManager } from '../../../state';
import { ExportWhiteboardDialogDownloadFile } from './ExportWhiteboardDialogDownloadFile';

let widgetApi: MockedWidgetApi;

afterEach(() => {
  widgetApi.stop();
});

beforeEach(() => {
  widgetApi = mockWidgetApi();
  // @ts-ignore forcefully set for tests
  widgetApi.widgetParameters.baseUrl = 'https://example.com';
});

describe('<ExportWhiteboardDialogDownloadFile />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  const onClick = jest.fn();
  let downloadElement: HTMLAnchorElement;

  beforeEach(() => {
    const createElement = document.createElement.bind(document);
    jest.spyOn(document, 'createElement').mockImplementation((tag) => {
      const element = createElement(tag);

      if (element instanceof HTMLAnchorElement) {
        downloadElement = element;
        jest.spyOn(element, 'setAttribute');
      }

      return element;
    });

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

  afterEach(() => {
    jest.mocked(document.createElement).mockRestore();
  });

  it('should render without exploding', async () => {
    render(
      <ExportWhiteboardDialogDownloadFile onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadFile>,
      { wrapper: Wrapper },
    );

    await act(() => {
      expect(
        screen.getByRole('button', { name: 'Download' }),
      ).toBeInTheDocument();
    });
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <ExportWhiteboardDialogDownloadFile onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadFile>,
      { wrapper: Wrapper },
    );

    expect(
      screen.getByRole('button', { name: 'Download' }),
    ).toBeInTheDocument();

    await act(async () => {
      expect(await axe(container)).toHaveNoViolations();
    });
  });

  it('should emit onClick on download', async () => {
    render(
      <ExportWhiteboardDialogDownloadFile onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadFile>,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByRole('button', { name: 'Download' }));
    expect(onClick).toHaveBeenCalled();
  });

  it('should use the room name for the file name', async () => {
    widgetApi.mockSendStateEvent(mockRoomName());

    render(
      <ExportWhiteboardDialogDownloadFile onClick={onClick}>
        Download
      </ExportWhiteboardDialogDownloadFile>,
      { wrapper: Wrapper },
    );

    await userEvent.click(screen.getByRole('button', { name: 'Download' }));

    expect(downloadElement?.setAttribute).toHaveBeenCalledWith(
      'download',
      'My Room.nwb',
    );
  });

  it('should download the correct whiteboard content', async () => {
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

    await userEvent.click(screen.getByRole('button', { name: 'Download' }));

    await waitFor(() => {
      expect(blobSpy).toHaveBeenCalledWith([
        JSON.stringify({
          version: 'net.nordeck.whiteboard@v1',
          whiteboard: {
            slides: [
              {
                elements: [
                  {
                    type: 'shape',
                    kind: 'ellipse',
                    position: { x: 0, y: 1 },
                    fillColor: '#ffffff',
                    height: 100,
                    width: 50,
                    text: '',
                  },
                ],
              },
            ],
          },
        }),
      ]);
    });
  });
});
