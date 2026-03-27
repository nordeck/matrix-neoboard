/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { render, screen } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from 'vitest';
import {
  mockFrameElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../../lib/testUtils';
import { WhiteboardManager } from '../../../state';
import { LayoutStateProvider } from '../../Layout';
import { SvgCanvas } from '../../Whiteboard/SvgCanvas';
import FrameDisplay from './Display';

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

describe('<FrameDisplay />', () => {
  let widgetApi: MockedWidgetApi;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let setPresentationMode: (enable: boolean, enableEdit?: boolean) => void;

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    ({ whiteboardManager, setPresentationMode } = mockWhiteboardManager());

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
    const element = mockFrameElement();
    render(
      <FrameDisplay
        elementId="element-0"
        activeElementIds={[]}
        elements={{}}
        {...element}
        active={false}
        readOnly={false}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(screen.getByTestId('element-frame-element-0'))
      .toMatchInlineSnapshot(`
      <g
        data-testid="element-frame-element-0"
      >
        <rect
          fill="#fff"
          height="100"
          stroke="#9e9e9e"
          stroke-width="2"
          width="200"
          x="10"
          y="20"
        />
      </g>
    `);
  });

  it('should not render in infinite canvas mode in presentation mode', () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    setPresentationMode(true);

    const element = mockFrameElement();
    render(
      <FrameDisplay
        elementId="element-0"
        activeElementIds={[]}
        elements={{}}
        {...element}
        active={false}
        readOnly={false}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(
      screen.queryByTestId('element-frame-element-0'),
    ).not.toBeInTheDocument();
  });

  it('should render in infinite canvas mode in presentation mode if edit mode is enabled', () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    setPresentationMode(true, true);

    const element = mockFrameElement();
    render(
      <FrameDisplay
        elementId="element-0"
        activeElementIds={[]}
        elements={{}}
        {...element}
        active={false}
        readOnly={false}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(screen.getByTestId('element-frame-element-0')).toBeInTheDocument();
  });
});
