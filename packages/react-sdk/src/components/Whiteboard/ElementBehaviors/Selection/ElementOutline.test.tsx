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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { render, screen } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockPolylineElement,
  mockWhiteboardManager,
} from '../../../../lib/testUtils/documentTestUtils';
import { LayoutStateProvider } from '../../../Layout';
import { SvgCanvas } from '../../SvgCanvas';
import { ElementOutline } from './ElementOutline';

describe('<ElementOutline />', () => {
  let widgetApi: MockedWidgetApi;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['polyline-0', mockPolylineElement()],
            [
              'curve-0',
              mockPolylineElement({
                kind: 'curve',
                position: { x: 10, y: 20 },
                points: [
                  { x: 0, y: 0 },
                  { x: 30, y: 15 },
                ],
                svgPathD: 'M0,0 L30,15',
              }),
            ],
          ],
        ],
      ],
    });

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

  it('should not render an outline for a single selected element', () => {
    render(<ElementOutline elementIds={['curve-0']} />, {
      wrapper: Wrapper,
    });

    expect(
      screen.queryByTestId('element-curve-0-outline'),
    ).not.toBeInTheDocument();
  });

  it('should render an outline for a selected curve element matching its boundary points', () => {
    render(<ElementOutline elementIds={['polyline-0', 'curve-0']} />, {
      wrapper: Wrapper,
    });

    // points are the curve's own bounding-box corners [{0,0}, {30,15}],
    // so width/height come directly from them, and x/y from position.
    expect(screen.getByTestId('element-curve-0-outline'))
      .toMatchInlineSnapshot(`
      <rect
        data-testid="element-curve-0-outline"
        fill="transparent"
        height="15"
        stroke="#1976d2"
        stroke-width="1"
        width="30"
        x="10"
        y="20"
      />
    `);
  });

  it('should render an outline for a selected polyline element alongside it', () => {
    render(<ElementOutline elementIds={['polyline-0', 'curve-0']} />, {
      wrapper: Wrapper,
    });

    // default mockPolylineElement points [{0,1},{2,3},{4,5}] and
    // position {0,1} give a bounding box of width 4, height 4.
    expect(screen.getByTestId('element-polyline-0-outline'))
      .toMatchInlineSnapshot(`
      <rect
        data-testid="element-polyline-0-outline"
        fill="transparent"
        height="4"
        stroke="#1976d2"
        stroke-width="1"
        width="4"
        x="0"
        y="1"
      />
    `);
  });
});
