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
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockInstance,
  vi,
} from 'vitest';
import type { FetchMock } from 'vitest-fetch-mock';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../../lib/testUtils/documentTestUtils';
import { LayoutStateProvider } from '../../Layout';
import { SlidesProvider } from '../../Layout/SlidesProvider';
import { whiteboardHeight, whiteboardWidth } from '../../Whiteboard';
import { SvgCanvas } from '../../Whiteboard/SvgCanvas';
import ImageDisplay from './ImageDisplay';
const fetch = global.fetch as FetchMock;

describe('<ImageDisplay />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let widgetApi: MockedWidgetApi;
  let createObjectURLSpy: MockInstance<typeof URL.createObjectURL>;

  beforeEach(() => {
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

    createObjectURLSpy = vi
      .mocked(URL.createObjectURL)
      .mockReturnValue('http://...');
    // @ts-expect-error mock doesnt want blob but we need blob. So we just do blob
    fetch.mockResponse((req) => {
      if (
        req.url ===
        'https://example.com/_matrix/media/v3/download/example.com/test1234'
      ) {
        return { status: 200, body: new Blob() };
      }
      return { status: 200, body: new Blob() };
    });
  });

  afterEach(() => {
    widgetApi.stop();
    createObjectURLSpy.mockReset();
    fetch.resetMocks();
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
