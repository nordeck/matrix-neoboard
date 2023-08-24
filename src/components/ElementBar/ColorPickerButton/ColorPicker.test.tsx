/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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
import {
  blueGrey,
  common,
  green,
  grey,
  lightBlue,
  lightGreen,
  pink,
  red,
  yellow,
} from '@mui/material/colors';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from '../../../state';
import { LayoutStateProvider, useLayoutState } from '../../Layout';
import { Toolbar } from '../../common/Toolbar';
import { ColorPicker } from './ColorPicker';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<ColorPicker/>', () => {
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let activeColor: string;
  let setActiveColor: (color: string) => void;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager());

    function LayoutStateExtractor() {
      ({ setActiveColor, activeColor } = useLayoutState());
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
    render(<ColorPicker />, { wrapper: Wrapper });

    const button = screen.getByRole('button', { name: 'Pick a color' });
    expect(button).toHaveAttribute('aria-haspopup', 'grid');

    await userEvent.click(button);

    const grid = await screen.findByRole('grid', { name: 'Colors' });

    const [firstRow, secondRow] = within(grid).getAllByRole('row');

    const greyButton = within(grid).getByRole('button', { name: 'Grey' });

    expect(greyButton).toHaveFocus();
    expect(greyButton).toHaveAttribute('tabindex', '0');

    expect(
      within(firstRow)
        .getAllByRole('button')
        .map((e) => [e.getAttribute('aria-label'), e.getAttribute('tabindex')]),
    ).toEqual([
      ['White', '-1'],
      ['Red', '-1'],
      ['Pink', '-1'],
      ['Purple', '-1'],
      ['Deep purple', '-1'],
      ['Indigo', '-1'],
      ['Blue', '-1'],
      ['Light blue', '-1'],
      ['Cyan', '-1'],
      ['Teal', '-1'],
      ['Green', '-1'],
    ]);

    expect(
      within(secondRow)
        .getAllByRole('button')
        .map((e) => [e.getAttribute('aria-label'), e.getAttribute('tabindex')]),
    ).toEqual([
      ['Light green', '-1'],
      ['Lime', '-1'],
      ['Yellow', '-1'],
      ['Amber', '-1'],
      ['Orange', '-1'],
      ['Deep orange', '-1'],
      ['Brown', '-1'],
      ['Grey', '0'],
      ['Blue grey', '-1'],
      ['Black', '-1'],
    ]);
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<ColorPicker />, { wrapper: Wrapper });

    expect(
      screen.getByRole('button', { name: 'Pick a color' }),
    ).toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('should have no accessibility violations, when open', async () => {
    const { baseElement } = render(<ColorPicker />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole('button', { name: 'Pick a color' }));

    expect(
      await screen.findByRole('grid', { name: 'Colors' }),
    ).toBeInTheDocument();

    expect(
      await axe(baseElement, {
        rules: {
          // the popover is opened in a portal, so we must check the baseElement,
          // i.e. <body/>. In that case we get false positive warning
          region: { enabled: false },
        },
      }),
    ).toHaveNoViolations();
  });

  it('should select another color by mouse', async () => {
    render(<ColorPicker />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole('button', { name: 'Pick a color' }));
    const grid = await screen.findByRole('grid', { name: 'Colors' });

    await userEvent.click(within(grid).getByRole('button', { name: 'Red' }));

    expect(activeColor).toEqual(red[500]);

    await waitFor(() => {
      expect(grid).not.toBeInTheDocument();
    });
  });

  it('should select another color by keyboard', async () => {
    render(<ColorPicker />, { wrapper: Wrapper });

    const colorButton = screen.getByRole('button', { name: 'Pick a color' });
    colorButton.focus();

    await userEvent.keyboard('[ArrowDown]');

    const grid = await screen.findByRole('grid', { name: 'Colors' });

    await userEvent.keyboard('[ArrowRight][Enter]');

    expect(activeColor).toEqual(blueGrey[500]);

    await waitFor(() => {
      expect(grid).not.toBeInTheDocument();
    });
  });

  it.each`
    fromColor          | fromColorName    | key                             | toColorName      | toColor
    ${lightGreen[500]} | ${'Light green'} | ${'[ArrowLeft]'}                | ${'Green'}       | ${green[500]}
    ${green[500]}      | ${'Green'}       | ${'[ArrowRight]'}               | ${'Light green'} | ${lightGreen[500]}
    ${yellow[500]}     | ${'Yellow'}      | ${'[ArrowUp]'}                  | ${'Pink'}        | ${pink[500]}
    ${lightBlue[500]}  | ${'Light blue'}  | ${'[ArrowDown]'}                | ${'Grey'}        | ${grey[500]}
    ${grey[500]}       | ${'Grey'}        | ${'[Home]'}                     | ${'Light green'} | ${lightGreen[500]}
    ${grey[500]}       | ${'Grey'}        | ${'{Control>}{Home}{/Control}'} | ${'White'}       | ${common.white}
    ${lightBlue[500]}  | ${'Light blue'}  | ${'[End]'}                      | ${'Green'}       | ${green[500]}
    ${lightBlue[500]}  | ${'Light blue'}  | ${'{Control>}{End}{/Control}'}  | ${'Black'}       | ${common.black}
    ${yellow[500]}     | ${'Yellow'}      | ${'[PageUp]'}                   | ${'Pink'}        | ${pink[500]}
    ${lightBlue[500]}  | ${'Light blue'}  | ${'[PageDown]'}                 | ${'Grey'}        | ${grey[500]}
  `(
    'should move focus from $fromColorName to $toColorName on $key',
    async ({ fromColor, fromColorName, key, toColorName, toColor }) => {
      render(<ColorPicker />, { wrapper: Wrapper });

      act(() => setActiveColor(fromColor));

      await userEvent.click(
        screen.getByRole('button', { name: 'Pick a color' }),
      );
      const grid = await screen.findByRole('grid', { name: 'Colors' });

      const fromButton = within(grid).getByRole('button', {
        name: fromColorName,
      });
      const toButton = screen.getByRole('button', { name: toColorName });

      expect(fromButton).toHaveFocus();
      expect(fromButton).toHaveAttribute('tabindex', '0');
      expect(toButton).not.toHaveFocus();
      expect(toButton).toHaveAttribute('tabindex', '-1');

      await userEvent.keyboard(key);

      expect(fromButton).not.toHaveFocus();
      expect(fromButton).toHaveAttribute('tabindex', '-1');
      expect(toButton).toHaveFocus();
      expect(toButton).toHaveAttribute('tabindex', '0');

      expect(activeColor).toBe(fromColor);
      await userEvent.keyboard('[Enter]');
      expect(activeColor).toBe(toColor);
    },
  );

  it('should not move focus to left if the focus on the first element', async () => {
    render(<ColorPicker />, { wrapper: Wrapper });

    act(() => setActiveColor(common.white));

    await userEvent.click(screen.getByRole('button', { name: 'Pick a color' }));
    const grid = await screen.findByRole('grid', { name: 'Colors' });

    expect(within(grid).getByRole('button', { name: 'White' })).toHaveFocus();

    await userEvent.keyboard('[ArrowLeft]');

    expect(screen.getByRole('button', { name: 'White' })).toHaveFocus();
  });

  it('should not move focus to right if the focus on the last element', async () => {
    render(<ColorPicker />, { wrapper: Wrapper });

    act(() => setActiveColor(common.black));

    await userEvent.click(screen.getByRole('button', { name: 'Pick a color' }));
    const grid = await screen.findByRole('grid', { name: 'Colors' });

    expect(within(grid).getByRole('button', { name: 'Black' })).toHaveFocus();

    await userEvent.keyboard('[ArrowRight]');

    expect(screen.getByRole('button', { name: 'Black' })).toHaveFocus();
  });

  it('should be hidden when selected color is transparent', async () => {
    render(<ColorPicker />, { wrapper: Wrapper });

    const colorButton = screen.queryByRole('button', { name: 'Pick a color' });

    act(() => setActiveColor('transparent'));

    expect(colorButton).not.toBeInTheDocument();
  });
});
