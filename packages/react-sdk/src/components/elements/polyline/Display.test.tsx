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
import { act, render, renderHook, screen } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { simplifyPointsToD } from '../../../lib/pathSmoothing';
import {
  WhiteboardTestingContextProvider,
  mockPolylineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils';
import { useElement } from '../../../state';
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
    vi.useRealTimers();
  });

  it('should render a plain polyline while no smoothed path is available yet', () => {
    const element = mockPolylineElement();
    render(
      <Display
        elementId="draft"
        activeElementIds={['draft']}
        elements={{}}
        {...element}
        active={false}
        readOnly={false}
      />,
      {
        wrapper: Wrapper,
      },
    );

    expect(screen.getByTestId('element-draft')).toMatchInlineSnapshot(`
      <g
        data-testid="element-draft"
      >
        <polyline
          fill="none"
          points="0,2 2,4 4,6"
          stroke="#ffffff"
          stroke-linejoin="round"
          stroke-width="4"
        />
      </g>
    `);
  });

  it('should render the precomputed smoothed SVG path when svgPathD is set', () => {
    const element = mockPolylineElement({
      svgPathD: 'M0,0 C2,4 4,6 4,6',
    });
    render(
      <Display
        elementId="element-0"
        activeElementIds={['element-0']}
        elements={{}}
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
        <path
          d="M0,0 C2,4 4,6 4,6"
          fill="none"
          stroke="#ffffff"
          stroke-width="4"
          transform="translate(0, 1)"
        />
      </g>
    `);
  });

  it('should compute the curve after initial render and persist it', () => {
    vi.useFakeTimers();

    const element = mockPolylineElement();
    const { whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', [['polyline-0', element]]]],
    });

    const LocalWrapper = ({ children }: PropsWithChildren<{}>) => (
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

    render(
      <Display
        elementId="polyline-0"
        activeElementIds={['polyline-0']}
        elements={{}}
        {...element}
        active={false}
        readOnly={false}
      />,
      {
        wrapper: LocalWrapper,
      },
    );

    const { result } = renderHook(() => useElement('polyline-0'), {
      wrapper: LocalWrapper,
    });

    // before path simplification
    expect(result.current).toEqual(element);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    const expectedD = simplifyPointsToD(element.points);

    // expect the async curve simplification to finish
    expect(result.current).toEqual({ ...element, svgPathD: expectedD });
  });
});
