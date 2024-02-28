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
  mockLineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { LayoutStateProvider } from '../../Layout';
import { SvgCanvas } from '../../Whiteboard/SvgCanvas';
import Display from './Display';

describe('<Display />', () => {
  let widgetApi: MockedWidgetApi;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    const { whiteboardManager } = mockWhiteboardManager();

    Wrapper = ({ children }) => {
      return (
        <LayoutStateProvider>
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            <SvgCanvas viewportWidth={200} viewportHeight={200}>
              {children}
            </SvgCanvas>
          </WhiteboardTestingContextProvider>
        </LayoutStateProvider>
      );
    };
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should render without exploding', () => {
    const element = mockLineElement();
    render(
      <Display
        elementId="element-0"
        {...element}
        active={false}
        readOnly={false}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(
      screen.queryByTestId('element-0-end-marker'),
    ).not.toBeInTheDocument();
  });

  it('should render an end marker', () => {
    const element = mockLineElement({ endMarker: 'arrow-head-line' });
    render(
      <Display
        elementId="element-0"
        {...element}
        active={false}
        readOnly={false}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(screen.getByTestId('element-0-end-marker')).toBeInTheDocument();
  });
});
