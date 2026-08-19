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
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockPolylineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardSlideInstance } from '../../../state';
import { Toolbar } from '../../common/Toolbar';
import { LayoutStateProvider } from '../../Layout';
import { defaultStrokeWidth } from '../../Whiteboard/constants';
import { PolylineThicknessSelect } from './PolylineThicknessSelect';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<PolylineThicknessSelect/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let slide: WhiteboardSlideInstance;

  beforeEach(() => {
    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockPolylineElement({ strokeWidth: 8 })],
            ['element-7', mockPolylineElement({ strokeWidth: 7 })],
            [
              'element-undefined',
              mockPolylineElement({ strokeWidth: undefined }),
            ],
            ['ellipse', mockEllipseElement()],
          ],
        ],
      ],
    });
    slide = whiteboardManager
      .getActiveWhiteboardInstance()!
      .getSlide('slide-0');
    slide.setActiveElementIds(['element-0']);

    Wrapper = ({ children }) => (
      <WhiteboardTestingContextProvider
        whiteboardManager={whiteboardManager}
        widgetApi={widgetApi}
      >
        <LayoutStateProvider>
          <Toolbar>{children}</Toolbar>
        </LayoutStateProvider>
      </WhiteboardTestingContextProvider>
    );
  });

  it('should render without exploding', async () => {
    render(<PolylineThicknessSelect />, { wrapper: Wrapper });

    const select = screen.getByRole('combobox', {
      name: 'Select Line Thickness',
    });

    expect(select).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<PolylineThicknessSelect />, {
      wrapper: Wrapper,
    });

    expect(
      screen.getByRole('combobox', { name: 'Select Line Thickness' }),
    ).toBeInTheDocument();

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should show the stroke width of the active element', async () => {
    slide.setActiveElementId('element-7');
    render(<PolylineThicknessSelect />, { wrapper: Wrapper });

    const select = screen.getByRole('combobox', {
      name: 'Select Line Thickness',
    });

    expect(select).toHaveTextContent('7');
  });

  it('should show the default stroke width if the active element has none', async () => {
    slide.setActiveElementId('element-undefined');
    render(<PolylineThicknessSelect />, { wrapper: Wrapper });

    const select = screen.getByRole('combobox', {
      name: 'Select Line Thickness',
    });

    expect(select).toHaveTextContent('4');
  });

  it('should show the stroke width of the first selected element if several elements are active', async () => {
    slide.setActiveElementIds(['element-7', 'element-0']);
    render(<PolylineThicknessSelect />, { wrapper: Wrapper });

    const select = screen.getByRole('combobox', {
      name: 'Select Line Thickness',
    });

    expect(select).toHaveTextContent('7');
  });

  it('should always contain the default stroke width as an option', async () => {
    slide.setActiveElementId('element-7');
    render(<PolylineThicknessSelect />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('combobox', { name: 'Select Line Thickness' }),
    );

    expect(
      screen.getByRole('option', { name: `${defaultStrokeWidth}` }),
    ).toBeInTheDocument();
  });

  it('should not render if the active element is not a polyline', async () => {
    slide.setActiveElementId('ellipse');
    render(<PolylineThicknessSelect />, { wrapper: Wrapper });

    expect(
      screen.queryByRole('combobox', { name: 'Select Line Thickness' }),
    ).not.toBeInTheDocument();
  });
});
