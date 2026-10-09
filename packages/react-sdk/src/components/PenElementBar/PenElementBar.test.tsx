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
import { common, red } from '@mui/material/colors';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, Mocked } from 'vitest';
import {
  mockEllipseElement,
  mockPolylineElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils/documentTestUtils';
import {
  WhiteboardInstance,
  WhiteboardManager,
  WhiteboardSlideInstance,
} from '../../state';
import { LayoutStateProvider, useLayoutState } from '../Layout';
import PenElementBar from './PenElementBar';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<PenElementBar/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;
  let activeSlide: WhiteboardSlideInstance;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', [['element-1', mockEllipseElement()]]]],
    }));

    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboardInstance.getSlide('slide-0');

    Wrapper = ({ children }) => (
      <WhiteboardTestingContextProvider
        whiteboardManager={whiteboardManager}
        widgetApi={widgetApi}
      >
        <LayoutStateProvider>{children}</LayoutStateProvider>
      </WhiteboardTestingContextProvider>
    );
  });

  it('should render without exploding', () => {
    render(<PenElementBar />, { wrapper: Wrapper });

    expect(screen.getByRole('toolbar', { name: 'Pen' })).toBeInTheDocument();
  });

  it('should render the duplicate and delete buttons when an element is selected', () => {
    activeSlide.setActiveElementIds(['element-1']);

    render(<PenElementBar />, { wrapper: Wrapper });

    expect(
      screen.getByRole('button', { name: 'Duplicate previous stroke' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete previous stroke' }),
    ).toBeInTheDocument();
  });

  it('should not render the delete button when nothing is selected', () => {
    render(<PenElementBar />, { wrapper: Wrapper });

    expect(
      screen.queryByRole('button', { name: 'Delete previous stroke' }),
    ).not.toBeInTheDocument();
  });

  it('should change the color for the next stroke without altering the currently selected polyline', async () => {
    const polylineId = activeSlide.addElement(
      mockPolylineElement({ strokeColor: common.white }),
    );
    activeSlide.setActiveElementIds([polylineId]);

    let activeColor: string | undefined;
    function LayoutStateExtractor() {
      ({ activeColor } = useLayoutState());
      return null;
    }

    render(
      <>
        <LayoutStateExtractor />
        <PenElementBar />
      </>,
      { wrapper: Wrapper },
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Pick the next stroke color' }),
    );
    const grid = await screen.findByRole('grid', { name: 'Colors' });
    await userEvent.click(within(grid).getByRole('button', { name: 'Red' }));

    // the already-drawn polyline keeps its original color
    expect(activeSlide.getElement(polylineId)).toMatchObject({
      strokeColor: common.white,
    });

    // color for the next stroke changed
    expect(activeColor).toEqual(red[500]);
  });

  it('should have no accessibility violations', async () => {
    activeSlide.setActiveElementIds(['element-1']);

    const { container } = render(<PenElementBar />, { wrapper: Wrapper });

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
