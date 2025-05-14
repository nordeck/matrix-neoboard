/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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
  mockLineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardSlideInstance } from '../../../state';
import { Toolbar } from '../../common/Toolbar';
import { LayoutStateProvider } from '../../Layout';
import { LineMarkerButtons } from './LineMarkerButtons';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<LineMarkerButtons />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let slide: WhiteboardSlideInstance;

  beforeEach(() => {
    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockLineElement({ endMarker: 'arrow-head-line' })],
            ['element-1', mockLineElement()],
            [
              'element-2',
              mockLineElement({
                startMarker: 'arrow-head-line',
                endMarker: 'arrow-head-line',
              }),
            ],
          ],
        ],
      ],
    });
    slide = whiteboardManager
      .getActiveWhiteboardInstance()!
      .getSlide('slide-0');
    slide.setActiveElementIds(['element-0', 'element-1', 'element-2']);

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
    render(<LineMarkerButtons />, { wrapper: Wrapper });

    const lineStartSelect = screen.getByRole('combobox', {
      name: 'Line Start',
    });

    const lineMarkerSwitch = screen.getByRole('radio', {
      name: 'Line Marker Switch',
    });

    const lineEndSelect = screen.getByRole('combobox', {
      name: 'Line End',
    });

    expect(lineStartSelect).toBeInTheDocument();
    expect(lineMarkerSwitch).toBeInTheDocument();
    expect(lineEndSelect).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<LineMarkerButtons />, {
      wrapper: Wrapper,
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should have the correct line marker values selected', async () => {
    render(<LineMarkerButtons />, { wrapper: Wrapper });

    const lineStartSelect = screen.getByRole('combobox', {
      name: 'Line Start',
    });

    const lineEndSelect = screen.getByRole('combobox', {
      name: 'Line End',
    });

    /**
     * TODO: This is a workaround for the fact that the Select component
     * does not set the value on the select element itself, but on a
     * child element.
     */

    // eslint-disable-next-line testing-library/no-node-access
    const startValue = lineStartSelect.querySelector('*');
    // eslint-disable-next-line testing-library/no-node-access
    const endValue = lineEndSelect.querySelector('*');

    expect(startValue?.getAttribute('data-testid')).toBe('RemoveIcon');
    expect(endValue?.getAttribute('data-testid')).toBe('ArrowForwardIcon');
  });

  it('should switch the markers for the selected line', async () => {
    slide.setActiveElementId('element-0');
    render(<LineMarkerButtons />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('radio', { name: 'Line Marker Switch' }),
    );

    expect(slide.getElement('element-0')).toEqual(
      expect.objectContaining({
        startMarker: 'arrow-head-line',
        endMarker: undefined,
      }),
    );
  });

  it('should change the line start marker', async () => {
    slide.setActiveElementId('element-1');

    render(<LineMarkerButtons />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole('combobox', { name: 'Line Start' }));
    await userEvent.click(screen.getByRole('option', { name: 'Arrow Back' }));

    expect(slide.getElement('element-1')).toEqual(
      expect.objectContaining({ startMarker: 'arrow-head-line' }),
    );
  });

  it('should set both line markers', async () => {
    slide.setActiveElementId('element-1');

    render(<LineMarkerButtons />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole('combobox', { name: 'Line Start' }));
    await userEvent.click(screen.getByRole('option', { name: 'Arrow Back' }));

    await userEvent.click(screen.getByRole('combobox', { name: 'Line End' }));
    await userEvent.click(
      screen.getByRole('option', { name: 'Arrow Forward' }),
    );

    expect(slide.getElement('element-1')).toEqual(
      expect.objectContaining({
        startMarker: 'arrow-head-line',
        endMarker: 'arrow-head-line',
      }),
    );
  });

  it('should reset both line markers', async () => {
    slide.setActiveElementId('element-2');

    render(<LineMarkerButtons />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole('combobox', { name: 'Line Start' }));
    await userEvent.click(screen.getByRole('option', { name: 'None' }));

    await userEvent.click(screen.getByRole('combobox', { name: 'Line End' }));
    await userEvent.click(screen.getByRole('option', { name: 'None' }));

    expect(slide.getElement('element-2')).toEqual(expect.objectContaining({}));
  });
});
