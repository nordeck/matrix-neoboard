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
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import { Mocked, afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockPolylineElement,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import {
  WhiteboardManager,
  WhiteboardSlideInstance,
  defaultStrokeWidth,
} from '../../state';
import { LayoutStateProvider, useLayoutState } from '../Layout';
import { Toolbar } from '../common/Toolbar';
import { NextStrokeWidthSelect } from './NextStrokeWidthSelect';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<NextStrokeWidthSelect/>', () => {
  let whiteboardManager: Mocked<WhiteboardManager>;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let activeSlide: WhiteboardSlideInstance;
  let activePolylineStrokeWidth: number;
  let setActivePolylineStrokeWidth: (value: number) => void;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', []]],
    }));
    activeSlide = whiteboardManager
      .getActiveWhiteboardInstance()!
      .getSlide('slide-0');

    function LayoutStateExtractor() {
      ({ activePolylineStrokeWidth, setActivePolylineStrokeWidth } =
        useLayoutState());
      return null;
    }

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <LayoutStateExtractor />

        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <Toolbar>{children}</Toolbar>
        </WhiteboardTestingContextProvider>
      </LayoutStateProvider>
    );
  });

  it('should render without exploding', () => {
    render(<NextStrokeWidthSelect />, { wrapper: Wrapper });

    expect(
      screen.getByRole('combobox', { name: 'Select the next stroke width' }),
    ).toHaveTextContent(String(defaultStrokeWidth));
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<NextStrokeWidthSelect />, {
      wrapper: Wrapper,
    });

    expect(
      screen.getByRole('combobox', { name: 'Select the next stroke width' }),
    ).toBeInTheDocument();

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should show the active stroke width of the layout state', () => {
    render(<NextStrokeWidthSelect />, { wrapper: Wrapper });

    act(() => setActivePolylineStrokeWidth(12));

    expect(
      screen.getByRole('combobox', { name: 'Select the next stroke width' }),
    ).toHaveTextContent('12');
  });

  it('should offer a custom active stroke width as an option', async () => {
    render(<NextStrokeWidthSelect />, { wrapper: Wrapper });

    act(() => setActivePolylineStrokeWidth(7));

    await userEvent.click(
      screen.getByRole('combobox', { name: 'Select the next stroke width' }),
    );

    expect(screen.getByRole('option', { name: '7' })).toBeInTheDocument();
  });

  it('should change the stroke width for the next stroke without altering the selected polyline', async () => {
    const polylineId = activeSlide.addElement(
      mockPolylineElement({ strokeWidth: 8 }),
    );
    activeSlide.setActiveElementIds([polylineId]);

    render(<NextStrokeWidthSelect />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('combobox', { name: 'Select the next stroke width' }),
    );
    await userEvent.click(screen.getByRole('option', { name: '16' }));

    expect(activePolylineStrokeWidth).toEqual(16);
    expect(activeSlide.getElement(polylineId)).toMatchObject({
      strokeWidth: 8,
    });
  });
});
