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
import { ComponentType, PropsWithChildren, useId } from 'react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockLineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { LayoutStateProvider } from '../../Layout';
import { SvgCanvas } from '../../Whiteboard/SvgCanvas';
import Display from './Display';

vi.mock('react', async (importActual) => ({
  ...(await importActual()),
  useId: vi.fn(),
}));

describe('<Display />', () => {
  let reactUseId = 1;
  let widgetApi: MockedWidgetApi;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeAll(() => {
    vi.mocked(useId).mockImplementation(() => `id-${reactUseId++}`);
  });

  beforeEach(() => {
    reactUseId = 1;
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

  it('should render as expected', () => {
    const element = mockLineElement();
    render(
      <Display
        elementId="element-0"
        activeElementIds={['element-0']}
        overrides={{}}
        {...element}
        active={false}
        readOnly={false}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(screen.getByTestId('element-element-0')).toMatchInlineSnapshot(`
      <g
        data-testid="element-element-0"
      >
        <line
          fill="none"
          stroke="transparent"
          stroke-width="14"
          x1="0"
          x2="2"
          y1="2"
          y2="4"
        />
        <line
          fill="none"
          stroke="#ffffff"
          stroke-width="4"
          x1="0"
          x2="2"
          y1="2"
          y2="4"
        />
      </g>
    `);
  });

  // TODO check why useEndMarker seems to be called three times here
  it('should render with an end marker as expected', () => {
    const element = mockLineElement({ endMarker: 'arrow-head-line' });
    render(
      <Display
        elementId="element-0"
        activeElementIds={['element-0']}
        overrides={{}}
        {...element}
        active={false}
        readOnly={false}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(screen.getByTestId('element-element-0')).toMatchInlineSnapshot(`
      <g
        data-testid="element-element-0"
      >
        <marker
          data-testid="end-marker-id-2"
          fill="none"
          id="end-marker-id-2"
          markerHeight="7"
          markerWidth="3.5"
          orient="auto"
          refX="3.5"
          refY="3.5"
          viewBox="0 0 3.5 7"
        >
          <path
            d="M0 0 L3.5 3.5 M3.5 3.5 L0 7"
            stroke="#ffffff"
          />
        </marker>
        <line
          fill="none"
          stroke="transparent"
          stroke-width="14"
          x1="0"
          x2="2"
          y1="2"
          y2="4"
        />
        <line
          fill="none"
          marker-end="url(#end-marker-id-2)"
          stroke="#ffffff"
          stroke-width="4"
          x1="0"
          x2="2"
          y1="2"
          y2="4"
        />
      </g>
    `);
  });
});
