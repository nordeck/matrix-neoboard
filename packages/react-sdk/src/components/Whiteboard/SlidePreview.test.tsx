/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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
  mockEllipseElement,
  mockFrameElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils';
import { WhiteboardManager } from '../../state';
import { WhiteboardHotkeysProvider } from '../WhiteboardHotkeysProvider';
import { SlidePreview } from './SlidePreview';

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  vi.mocked(getEnvironment).mockImplementation(
    (_, defaultValue) => defaultValue,
  );

  widgetApi = mockWidgetApi();
});

describe('<SlidePreview>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockEllipseElement()],
            ['element-1', mockEllipseElement({ attachedFrame: 'frame-0' })],
            [
              'frame-0',
              mockFrameElement({
                position: { x: 9600, y: 5400 },
                attachedElements: ['element-1'],
              }),
            ],
          ],
        ],
      ],
    }));

    Wrapper = ({ children }) => (
      <WhiteboardHotkeysProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      </WhiteboardHotkeysProvider>
    );
  });

  it('should render without exploding', () => {
    render(<SlidePreview />, { wrapper: Wrapper });

    expect(screen.getByTestId('element-ellipse-element-0')).toBeInTheDocument();
    expect(screen.getByTestId('element-ellipse-element-1')).toBeInTheDocument();
    expect(screen.getByTestId('element-frame-frame-0')).toBeInTheDocument();
  });

  it('should render without exploding in infinite canvas mode', () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    render(<SlidePreview />, { wrapper: Wrapper });

    expect(screen.getByTestId('element-ellipse-element-0')).toBeInTheDocument();
    expect(screen.getByTestId('element-ellipse-element-1')).toBeInTheDocument();
    expect(screen.getByTestId('element-frame-frame-0')).toBeInTheDocument();
  });

  it('should render elements attached to selected frame in infinite canvas mode', () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    render(<SlidePreview frameElementId="frame-0" />, { wrapper: Wrapper });

    expect(
      screen.queryByTestId('element-ellipse-element-0'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('element-ellipse-element-1')).toBeInTheDocument();
    expect(
      screen.queryByTestId('element-frame-frame-0'),
    ).not.toBeInTheDocument();
  });
});
