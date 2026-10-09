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
import { common, grey, red } from '@mui/material/colors';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import { Mocked, afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockPolylineElement,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardManager, WhiteboardSlideInstance } from '../../state';
import { LayoutStateProvider, useLayoutState } from '../Layout';
import { Toolbar } from '../common/Toolbar';
import { NextStrokeColorPicker } from './NextStrokeColorPicker';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<NextStrokeColorPicker/>', () => {
  let whiteboardManager: Mocked<WhiteboardManager>;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let activeSlide: WhiteboardSlideInstance;
  let activeColor: string;
  let activeShade: number;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', []]],
    }));
    const activeWhiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboard.getSlide('slide-0');

    function LayoutStateExtractor() {
      ({ activeColor, activeShade } = useLayoutState());
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

  it('should render without exploding', async () => {
    render(<NextStrokeColorPicker />, { wrapper: Wrapper });

    const button = screen.getByRole('button', {
      name: 'Pick the next stroke color',
    });
    expect(button).toHaveAttribute('aria-haspopup', 'grid');

    await userEvent.click(button);

    const grid = await screen.findByRole('grid', { name: 'Colors' });

    // the active color of the layout state is pre-selected
    const greyButton = within(grid).getByRole('button', { name: 'Grey' });
    expect(greyButton).toHaveFocus();
    expect(greyButton).toHaveAttribute('tabindex', '0');

    // the picker also offers the transparent color
    expect(
      within(grid).getByRole('button', { name: 'Transparent' }),
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<NextStrokeColorPicker />, {
      wrapper: Wrapper,
    });

    expect(
      screen.getByRole('button', { name: 'Pick the next stroke color' }),
    ).toBeInTheDocument();

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should have no accessibility violations, when open', async () => {
    const { baseElement } = render(<NextStrokeColorPicker />, {
      wrapper: Wrapper,
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Pick the next stroke color' }),
    );

    expect(
      await screen.findByRole('grid', { name: 'Colors' }),
    ).toBeInTheDocument();

    expect(
      await axe.run(baseElement, {
        rules: {
          // the popover is opened in a portal, so we must check the baseElement,
          // i.e. <body/>. In that case we get false positive warning
          region: { enabled: false },
        },
      }),
    ).toHaveNoViolations();
  });

  it('should select the color for the next stroke by mouse', async () => {
    render(<NextStrokeColorPicker />, { wrapper: Wrapper });

    expect(activeColor).toEqual(grey[500]);

    await userEvent.click(
      screen.getByRole('button', { name: 'Pick the next stroke color' }),
    );
    const grid = await screen.findByRole('grid', { name: 'Colors' });

    await userEvent.click(within(grid).getByRole('button', { name: 'Red' }));

    expect(activeColor).toEqual(red[500]);
    expect(screen.getByRole('grid', { name: 'Colors' })).toBeInTheDocument();
  });

  it('should select a shade for the next stroke', async () => {
    render(<NextStrokeColorPicker />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('button', { name: 'Pick the next stroke color' }),
    );
    const grid = await screen.findByRole('grid', { name: 'Colors' });

    await userEvent.click(within(grid).getByRole('button', { name: 'Red' }));
    await userEvent.click(screen.getByRole('radio', { name: 'lightest' }));

    expect(activeShade).toEqual(0);
    expect(activeColor).not.toEqual(red[500]);
    expect(screen.getByRole('radio', { name: 'lightest' })).toBeChecked();
  });

  it('should not change the active color when selecting transparent', async () => {
    render(<NextStrokeColorPicker />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('button', { name: 'Pick the next stroke color' }),
    );
    const grid = await screen.findByRole('grid', { name: 'Colors' });

    await userEvent.click(
      within(grid).getByRole('button', { name: 'Transparent' }),
    );

    expect(activeColor).toEqual(grey[500]);
  });

  it('should not alter the selected elements', async () => {
    const polylineId = activeSlide.addElement(
      mockPolylineElement({ strokeColor: common.white }),
    );
    activeSlide.setActiveElementIds([polylineId]);

    render(<NextStrokeColorPicker />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('button', { name: 'Pick the next stroke color' }),
    );
    const grid = await screen.findByRole('grid', { name: 'Colors' });

    await userEvent.click(within(grid).getByRole('button', { name: 'Red' }));

    expect(activeColor).toEqual(red[500]);
    expect(activeSlide.getElement(polylineId)).toMatchObject({
      strokeColor: common.white,
    });
  });
});
