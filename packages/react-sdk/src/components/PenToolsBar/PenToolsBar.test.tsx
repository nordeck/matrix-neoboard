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
import { PenToolsBar } from './PenToolsBar';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<PenToolsBar/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;
  let activeSlide: WhiteboardSlideInstance;
  let activeColor: string;
  let activePathStrokeWidth: number;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', [['element-1', mockEllipseElement()]]]],
    }));

    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboardInstance.getSlide('slide-0');

    function LayoutStateExtractor() {
      ({ activeColor, activePathStrokeWidth } = useLayoutState());
      return null;
    }

    Wrapper = ({ children }) => (
      <WhiteboardTestingContextProvider
        whiteboardManager={whiteboardManager}
        widgetApi={widgetApi}
      >
        <LayoutStateProvider>
          <LayoutStateExtractor />
          {children}
        </LayoutStateProvider>
      </WhiteboardTestingContextProvider>
    );
  });

  it('should render without exploding', () => {
    render(<PenToolsBar />, { wrapper: Wrapper });

    expect(screen.getByRole('toolbar', { name: 'Pen' })).toBeInTheDocument();
    expect(
      screen.getByRole('combobox', { name: 'Select the next stroke width' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pick the next stroke color' }),
    ).toBeInTheDocument();
  });

  it('should render the duplicate and delete buttons when an element is selected', () => {
    activeSlide.setActiveElementIds(['element-1']);

    render(<PenToolsBar />, { wrapper: Wrapper });

    expect(
      screen.getByRole('combobox', { name: 'Select the next stroke width' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Pick the next stroke color' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Duplicate last stroke' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Delete last stroke' }),
    ).toBeInTheDocument();
  });

  it('should move focus through all items with the arrow keys', async () => {
    activeSlide.setActiveElementIds(['element-1']);

    render(<PenToolsBar />, { wrapper: Wrapper });

    screen
      .getByRole('combobox', { name: 'Select the next stroke width' })
      .focus();

    await userEvent.keyboard('{ArrowRight}');
    expect(
      screen.getByRole('button', { name: 'Pick the next stroke color' }),
    ).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(
      screen.getByRole('button', { name: 'Duplicate last stroke' }),
    ).toHaveFocus();

    await userEvent.keyboard('{ArrowRight}');
    expect(
      screen.getByRole('button', { name: 'Delete last stroke' }),
    ).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}');
    expect(
      screen.getByRole('button', { name: 'Duplicate last stroke' }),
    ).toHaveFocus();
  });

  it('should wrap the focus around the items with the arrow keys', async () => {
    activeSlide.setActiveElementIds(['element-1']);

    render(<PenToolsBar />, { wrapper: Wrapper });

    const strokeWidthSelect = screen.getByRole('combobox', {
      name: 'Select the next stroke width',
    });
    const deleteButton = screen.getByRole('button', {
      name: 'Delete last stroke',
    });

    // from the last item to the first item
    deleteButton.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(strokeWidthSelect).toHaveFocus();

    // from the first item to the last item
    await userEvent.keyboard('{ArrowLeft}');
    expect(deleteButton).toHaveFocus();
  });

  it('should not render the duplicate and delete buttons when nothing is selected', () => {
    render(<PenToolsBar />, { wrapper: Wrapper });

    expect(
      screen.queryByRole('button', { name: 'Duplicate last stroke' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Delete last stroke' }),
    ).not.toBeInTheDocument();
  });

  it('should change the color for the next stroke without altering the currently selected polyline', async () => {
    const polylineId = activeSlide.addElement(
      mockPolylineElement({ strokeColor: common.white }),
    );
    activeSlide.setActiveElementIds([polylineId]);

    render(<PenToolsBar />, { wrapper: Wrapper });

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

  it('should change the stroke width for the next stroke without altering the currently selected polyline', async () => {
    const polylineId = activeSlide.addElement(
      mockPolylineElement({ strokeWidth: 8 }),
    );
    activeSlide.setActiveElementIds([polylineId]);

    render(<PenToolsBar />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('combobox', { name: 'Select the next stroke width' }),
    );
    await userEvent.click(screen.getByRole('option', { name: '16' }));

    // the already-drawn polyline keeps its original width
    expect(activeSlide.getElement(polylineId)).toMatchObject({
      strokeWidth: 8,
    });

    // width for the next stroke changed
    expect(activePathStrokeWidth).toEqual(16);
  });

  it('should duplicate the last stroke', async () => {
    const polylineId = activeSlide.addElement(mockPolylineElement());
    activeSlide.setActiveElementIds([polylineId]);
    const elementCount = activeSlide.getElementIds().length;

    render(<PenToolsBar />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('button', { name: 'Duplicate last stroke' }),
    );

    expect(activeSlide.getElementIds()).toHaveLength(elementCount + 1);
    expect(activeSlide.getElementIds()).toContain(polylineId);
  });

  it('should delete the last stroke', async () => {
    const polylineId = activeSlide.addElement(mockPolylineElement());
    activeSlide.setActiveElementIds([polylineId]);

    render(<PenToolsBar />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('button', { name: 'Delete last stroke' }),
    );

    expect(activeSlide.getElementIds()).not.toContain(polylineId);
    expect(activeSlide.getElementIds()).toContain('element-1');
  });

  it('should have no accessibility violations', async () => {
    activeSlide.setActiveElementIds(['element-1']);

    const { container } = render(<PenToolsBar />, { wrapper: Wrapper });

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
