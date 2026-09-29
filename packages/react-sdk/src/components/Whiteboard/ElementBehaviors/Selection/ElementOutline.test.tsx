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
  mockEllipseElement,
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
            ['element-shape', mockEllipseElement()],
            [
              'element-thick',
              mockPolylineElement({
                position: { x: 100, y: 100 },
                points: [
                  { x: 0, y: 0 },
                  { x: 50, y: 50 },
                ],
                strokeWidth: 20,
              }),
            ],
            [
              'element-thin',
              mockPolylineElement({
                position: { x: 300, y: 300 },
                points: [
                  { x: 0, y: 0 },
                  { x: 50, y: 50 },
                ],
                strokeWidth: 2,
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
          <SvgCanvas viewportWidth={500} viewportHeight={500}>
            {children}
          </SvgCanvas>
        </WhiteboardTestingContextProvider>
      </LayoutStateProvider>
    );
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should not render an outline for a single element', () => {
    render(<ElementOutline elementIds={['element-thick']} />, {
      wrapper: Wrapper,
    });

    expect(
      screen.queryByTestId('element-element-thick-outline'),
    ).not.toBeInTheDocument();
  });

  it('should contain the whole stroke of a thick polyline', () => {
    render(<ElementOutline elementIds={['element-shape', 'element-thick']} />, {
      wrapper: Wrapper,
    });

    // half of the stroke width overflows on every side
    expect(screen.getByTestId('element-element-thick-outline'))
      .toMatchInlineSnapshot(`
      <rect
        data-testid="element-element-thick-outline"
        fill="transparent"
        height="70"
        stroke="#1976d2"
        stroke-width="1"
        width="70"
        x="90"
        y="90"
      />
    `);
  });

  it('should not modify the outline for shapes (no strokeWidth)', () => {
    render(<ElementOutline elementIds={['element-shape', 'element-thick']} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByTestId('element-element-shape-outline'))
      .toMatchInlineSnapshot(`
      <rect
        data-testid="element-element-shape-outline"
        fill="transparent"
        height="100"
        stroke="#1976d2"
        stroke-width="1"
        width="50"
        x="0"
        y="1"
      />
    `);
  });
});
