/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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
import { render, screen, within } from '@testing-library/react';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';

import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, Mocked } from 'vitest';
import {
  mockEllipseElement,
  mockLineElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils/documentTestUtils';
import {
  WhiteboardInstance,
  WhiteboardManager,
  WhiteboardSlideInstance,
} from '../../state';
import { LayoutStateProvider } from '../Layout';
import { ElementBar } from './ElementBar';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<ElementBar/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;
  let activeSlide: WhiteboardSlideInstance;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-1', mockEllipseElement()],
            ['element-2', mockLineElement()],
            ['element-3', mockEllipseElement({ text: 'test' })],
          ],
        ],
      ],
    }));

    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementId('element-1');

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
    activeSlide.setActiveElementIds(['element-1', 'element-2', 'element-3']);
    render(<ElementBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Element' });

    expect(
      within(toolbar).getByRole('combobox', {
        name: 'Line Start',
      }),
    ).toBeInTheDocument();

    expect(
      within(toolbar).getByRole('radio', {
        name: 'Line Marker Switch',
      }),
    ).toBeInTheDocument();

    expect(
      within(toolbar).getByRole('combobox', {
        name: 'Line End',
      }),
    ).toBeInTheDocument();

    expect(
      within(toolbar).getByRole('combobox', {
        name: 'Select font family',
      }),
    ).toBeInTheDocument();

    expect(
      within(toolbar).getByRole('combobox', {
        name: 'Select font size',
      }),
    ).toBeInTheDocument();

    expect(
      within(toolbar).getByRole('checkbox', {
        name: 'Bold',
      }),
    ).toBeInTheDocument();

    expect(
      within(toolbar).getByRole('checkbox', {
        name: 'Italic',
      }),
    ).toBeInTheDocument();

    expect(
      within(toolbar).getByRole('button', {
        name: 'Pick a text color',
      }),
    ).toBeInTheDocument();

    expect(
      within(toolbar).getByRole('button', {
        name: 'Pick a color',
      }),
    ).toBeInTheDocument();

    expect(
      within(toolbar).getByRole('radiogroup', {
        name: 'Text Alignment',
      }),
    ).toBeInTheDocument();

    expect(
      within(toolbar).getByRole('button', {
        name: 'Duplicate the active element',
      }),
    ).toBeInTheDocument();

    expect(
      within(toolbar).getByRole('button', { name: 'Delete element' }),
    ).toBeInTheDocument();
  });

  it('should not render text tools when not required', () => {
    activeSlide.setActiveElementIds(['element-2']);
    render(<ElementBar showTextTools={false} />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Element' });

    expect(
      within(toolbar).queryByRole('combobox', {
        name: 'Select font family',
      }),
    ).not.toBeInTheDocument();

    expect(
      within(toolbar).queryByRole('combobox', {
        name: 'Select font size',
      }),
    ).not.toBeInTheDocument();

    expect(
      within(toolbar).queryByRole('checkbox', {
        name: 'Bold',
      }),
    ).not.toBeInTheDocument();

    expect(
      within(toolbar).queryByRole('checkbox', {
        name: 'Italic',
      }),
    ).not.toBeInTheDocument();

    expect(
      within(toolbar).queryByRole('button', {
        name: 'Pick a text color',
      }),
    ).not.toBeInTheDocument();

    expect(
      within(toolbar).getByRole('button', {
        name: 'Pick a color',
      }),
    ).toBeInTheDocument();

    expect(
      within(toolbar).queryByRole('radiogroup', {
        name: 'Text Alignment',
      }),
    ).not.toBeInTheDocument();

    expect(
      within(toolbar).getByRole('button', {
        name: 'Duplicate the active element',
      }),
    ).toBeInTheDocument();

    expect(
      within(toolbar).getByRole('button', { name: 'Delete element' }),
    ).toBeInTheDocument();
  });

  it.each([
    ['should delete a single element', ['element-1']],
    ['should delete multiple elements', ['element-1', 'element-2']],
  ])('%s', async (_testname, elementIds) => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementIds(elementIds);
    render(<ElementBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Element' });
    await userEvent.click(
      within(toolbar).getByRole('button', { name: /Delete element/ }),
    );

    // check that none of the elements to be deleted remain on the slide
    expect(
      activeSlide
        .getElementIds()
        .some((elementId) => elementIds.includes(elementId)),
    ).toBeFalsy();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<ElementBar />, {
      wrapper: Wrapper,
    });

    expect(await axe.run(container)).toHaveNoViolations();
  });
});
