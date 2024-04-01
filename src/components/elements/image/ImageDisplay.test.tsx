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
import { act, render, screen } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
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
  });

  afterEach(() => {
    jest.useRealTimers();
    widgetApi.stop();
  });

  it('should render without exploding', () => {
    render(
      <ImageDisplay
        elementId="element-0"
        type="image"
        fileName="example.jpeg"
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
    expect(screen.getByTestId('element-element-0-image')).toBeInTheDocument();
  });

  it('should render a skeleton until an image is loaded', async () => {
    render(
      <ImageDisplay
        elementId="element-0"
        type="image"
        fileName="example.jpeg"
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

    act(() => {
      screen
        .getByTestId('element-element-0-image')
        .dispatchEvent(new Event('load'));
    });

    expect(
      screen.queryByTestId('element-element-0-skeleton'),
    ).not.toBeInTheDocument();
  });

  it('should not have a context menu in read-only mode', () => {
    render(
      <ImageDisplay
        elementId="element-0"
        type="image"
        fileName="example.jpeg"
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
