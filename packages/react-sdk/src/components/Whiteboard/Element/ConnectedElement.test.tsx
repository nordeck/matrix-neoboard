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
import { ComponentType, PropsWithChildren } from 'react';
import {
  MockInstance,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockImageElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { ImageMimeType } from '../../../state';
import { LayoutStateProvider } from '../../Layout';
import { SlidesProvider } from '../../Layout/SlidesProvider';
import { SvgCanvas } from '../SvgCanvas';
import { whiteboardHeight, whiteboardWidth } from '../constants';
import { ConnectedElement } from './ConnectedElement';

describe('<ConnectedElement />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let widgetApi: MockedWidgetApi;
  let consoleSpy: MockInstance<typeof console.error>;

  beforeEach(() => {
    widgetApi = mockWidgetApi();
    consoleSpy = vi.spyOn(console, 'error');

    vi.mocked(URL.createObjectURL).mockReturnValue('http://...');

    const { whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', [['element-0', mockImageElement()]]]],
    });

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
  });

  afterEach(() => {
    widgetApi.stop();
    vi.mocked(URL.createObjectURL).mockReset();
  });

  it('should render an image element', async () => {
    // @ts-ignore ignore readonly prop for tests
    widgetApi.widgetParameters.baseUrl = 'https://example.com';

    render(
      <ConnectedElement
        id="element-0"
        activeElementIds={['element-0']}
        overrides={{}}
      />,
      { wrapper: Wrapper },
    );

    const imageElement = await screen.findByTestId('element-element-0-image');
    expect(imageElement).toBeInTheDocument();
  });

  it('should log and not render an image when there is no base URL', () => {
    consoleSpy.mockImplementation(() => {});

    render(
      <ConnectedElement
        id="element-0"
        activeElementIds={['element-0']}
        overrides={{}}
      />,
      { wrapper: Wrapper },
    );

    expect(console.error).toHaveBeenCalledWith(
      'Image cannot be rendered due to missing base URL',
    );
    expect(
      screen.queryByTestId('element-element-0-image'),
    ).not.toBeInTheDocument();
  });

  it('should render an error when an image is not available', async () => {
    vi.mocked(URL.createObjectURL).mockReturnValue('');

    // @ts-ignore ignore readonly prop for tests
    widgetApi.widgetParameters.baseUrl = 'https://example.com';

    render(
      <ConnectedElement
        id="element-0"
        activeElementIds={['element-0']}
        readOnly={false}
        overrides={{}}
      />,
      { wrapper: Wrapper },
    );

    const errorContainer = await screen.findByTestId(
      'element-element-0-error-container',
    );
    expect(errorContainer).toBeInTheDocument();

    const imageElement = screen.queryByTestId('element-element-0-image');
    expect(imageElement).not.toBeInTheDocument();

    vi.mocked(URL.createObjectURL).mockReset();
  });

  it.each([
    ['example.gif', 'image/gif'],
    ['example.jpeg', 'image/jpeg'],
    ['example.png', 'image/png'],
    ['example.svg', 'image/svg+xml'],
  ] as [string, ImageMimeType][])(
    'should render %s without exploding',
    async (fileName, mimeType) => {
      widgetApi = mockWidgetApi();
      consoleSpy = vi.spyOn(console, 'error');

      vi.mocked(URL.createObjectURL).mockReturnValue('http://...');

      const imageElementMock = mockImageElement();
      imageElementMock.fileName = fileName;
      imageElementMock.mimeType = mimeType;

      const { whiteboardManager } = mockWhiteboardManager({
        slides: [['slide-0', [['element-0', imageElementMock]]]],
      });

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

      // @ts-ignore ignore readonly prop for tests
      widgetApi.widgetParameters.baseUrl = 'https://example.com';

      render(
        <ConnectedElement
          id="element-0"
          activeElementIds={['element-0']}
          readOnly={false}
          overrides={{}}
        />,
        { wrapper: Wrapper },
      );

      const imageElement = await screen.findByTestId('element-element-0-image');
      expect(imageElement).toBeInTheDocument();
    },
  );

  // We skip this test as it seems to not work reliably with suspense. It seems to be running _after_ suspense already loaded the image.
  it.skip('should render a skeleton until an image is loaded', async () => {
    // @ts-ignore ignore readonly prop for tests
    widgetApi.widgetParameters.baseUrl = 'https://example.com';
    render(
      <ConnectedElement
        id="element-0"
        activeElementIds={['element-0']}
        readOnly={false}
        overrides={{}}
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
});
