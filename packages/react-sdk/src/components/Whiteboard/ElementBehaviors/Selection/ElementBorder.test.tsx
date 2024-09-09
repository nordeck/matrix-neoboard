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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockImageElement,
  mockLineElement,
  mockPolylineElement,
  mockWhiteboardManager,
} from '../../../../lib/testUtils/documentTestUtils';
import { WhiteboardSlideInstance } from '../../../../state';
import { LayoutStateProvider } from '../../../Layout';
import { SvgCanvas } from '../../SvgCanvas';
import { ElementBorder } from './ElementBorder';

// mock useMeasure to return anything to get a scale
vi.mock('../../SvgCanvas/useMeasure', () => {
  return {
    useMeasure: () => [
      null,
      {
        offsetX: 50,
        offsetY: 50,
        width: 100,
        height: 100,
      },
    ],
  };
});

describe('<ElementBorder />', () => {
  let widgetApi: MockedWidgetApi;
  let activeSlide: WhiteboardSlideInstance;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockEllipseElement()],
            ['element-1', mockPolylineElement()],
            ['element-2', mockLineElement()],
            ['element-3', mockImageElement()],
          ],
        ],
      ],
    });
    const activeWhiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboard.getSlide('slide-0');

    Wrapper = ({ children }) => (
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
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it.each`
    type          | id
    ${'shape'}    | ${'element-0'}
    ${'polyline'} | ${'element-1'}
    ${'image'}    | ${'element-3'}
  `('should render a border for an active $type element', ({ id }) => {
    activeSlide.setActiveElementIds([id]);

    render(<ElementBorder elementIds={[id]} />, { wrapper: Wrapper });

    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(screen.getByTestId(`${id}-border-${side}`)).toBeInTheDocument();
    }
  });

  it('should not render a border for an active line element', () => {
    activeSlide.setActiveElementIds(['element-2']);

    render(<ElementBorder elementIds={['element-2']} />, { wrapper: Wrapper });

    for (const side of ['top', 'right', 'bottom', 'left']) {
      expect(
        screen.queryByTestId(`element-2-border-${side}`),
      ).not.toBeInTheDocument();
    }
  });
});
