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
import { render, screen } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockImageElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { LayoutStateProvider } from '../../Layout';
import { SlidesProvider } from '../../Layout/SlidesProvider';
import { SvgCanvas } from '../SvgCanvas';
import { whiteboardHeight, whiteboardWidth } from '../constants';
import { ConnectedElement } from './ConnectedElement';

describe('<ConnectedElement />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let widgetApi: MockedWidgetApi;

  beforeEach(() => {
    widgetApi = mockWidgetApi();
    jest.spyOn(console, 'error');

    jest.mocked(URL.createObjectURL).mockReturnValue('http://...');

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
    jest.mocked(URL.createObjectURL).mockReset();
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
    jest.mocked(console.error).mockImplementation(() => {});

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
});
