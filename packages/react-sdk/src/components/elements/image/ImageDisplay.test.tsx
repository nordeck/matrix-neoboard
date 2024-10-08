/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock-jest';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { ImageMimeType } from '../../../state';
import { LayoutStateProvider } from '../../Layout';
import { SlidesProvider } from '../../Layout/SlidesProvider';
import { whiteboardHeight, whiteboardWidth } from '../../Whiteboard';
import { SvgCanvas } from '../../Whiteboard/SvgCanvas';
import ImageDisplay from './ImageDisplay';

describe('<ImageDisplay />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let widgetApi: MockedWidgetApi;

  beforeEach(() => {
    jest.useFakeTimers();
    widgetApi = mockWidgetApi();
    const { whiteboardManager } = mockWhiteboardManager();
    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <SlidesProvider>
            <SvgCanvas
              viewportWidth={whiteboardWidth}
              viewportHeight={whiteboardHeight}
            >
              {children}
            </SvgCanvas>
          </SlidesProvider>
        </WhiteboardTestingContextProvider>
      </LayoutStateProvider>
    );

    jest.mocked(URL.createObjectURL).mockReturnValue('http://...');
    fetchMock.get(
      'https://example.com/_matrix/*/download/example.com/test1234',
      '',
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    widgetApi.stop();
    jest.mocked(URL.createObjectURL).mockReset();
    fetchMock.mockReset();
  });

  it.each([
    ['example.gif', 'image/gif'],
    ['example.jpeg', 'image/jpeg'],
    ['example.png', 'image/png'],
    ['example.svg', 'image/svg+xml'],
  ] as [string, ImageMimeType][])(
    'should render %s without exploding',
    async (fileName, mimeType) => {
      render(
        <ImageDisplay
          elementId="element-0"
          type="image"
          fileName={fileName}
          mimeType={mimeType}
          baseUrl="https://example.com"
          mxc="mxc://example.com/test1234"
          width={200}
          height={300}
          position={{ x: 23, y: 42 }}
          active={false}
          readOnly={false}
        />,
        { wrapper: Wrapper },
      );

      expect(
        screen.getByTestId('element-element-0-skeleton'),
      ).toBeInTheDocument();
      const imageElement = await screen.findByTestId('element-element-0-image');
      expect(imageElement).toBeInTheDocument();
    },
  );

  it('should render a skeleton until an image is loaded', async () => {
    render(
      <ImageDisplay
        elementId="element-0"
        type="image"
        fileName="example.jpeg"
        mimeType="image/jpeg"
        baseUrl="https://example.com"
        mxc="mxc://example.com/test1234"
        width={200}
        height={300}
        position={{ x: 23, y: 42 }}
        active={false}
        readOnly={false}
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.getByTestId('element-element-0-skeleton'),
    ).toBeInTheDocument();

    const imageElement = await screen.findByTestId('element-element-0-image');
    expect(imageElement).toBeInTheDocument();
    fireEvent.load(imageElement);

    await waitFor(() => {
      expect(
        screen.queryByTestId('element-element-0-skeleton'),
      ).not.toBeInTheDocument();
    });
  });

  it('should render an error when an image is not available', async () => {
    jest.mocked(URL.createObjectURL).mockReturnValue('');

    render(
      <ImageDisplay
        elementId="element-0"
        type="image"
        fileName="example.jpeg"
        mimeType="image/jpeg"
        baseUrl="https://example.com"
        mxc="mxc://example.com/test1234"
        width={200}
        height={300}
        position={{ x: 23, y: 42 }}
        active={false}
        readOnly={false}
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.getByTestId('element-element-0-skeleton'),
    ).toBeInTheDocument();

    const errorContainer = await screen.findByTestId(
      'element-element-0-error-container',
    );
    expect(errorContainer).toBeInTheDocument();

    const imageElement = screen.queryByTestId('element-element-0-image');
    expect(imageElement).not.toBeInTheDocument();

    jest.mocked(URL.createObjectURL).mockReset();
  });

  it('should not have a context menu in read-only mode', () => {
    render(
      <ImageDisplay
        elementId="element-0"
        type="image"
        fileName="example.jpeg"
        mimeType="image/jpeg"
        baseUrl="https://example.com"
        mxc="mxc://example.com/test1234"
        width={200}
        height={300}
        position={{ x: 23, y: 42 }}
        active={false}
        readOnly={true}
      />,
      { wrapper: Wrapper },
    );

    expect(
      screen.queryByTestId('element-context-menu-container'),
    ).not.toBeInTheDocument();
  });
});
