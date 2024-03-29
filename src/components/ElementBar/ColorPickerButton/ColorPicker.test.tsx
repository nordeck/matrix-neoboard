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
  mockEllipseElement,
  mockLineElement,
  mockTextElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardManager, WhiteboardSlideInstance } from '../../../state';
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
  let activeSlide: WhiteboardSlideInstance;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockEllipseElement({ fillColor: green[500] })],
            ['element-1', mockEllipseElement()],
            ['element-2', mockLineElement({ strokeColor: grey[500] })],
            ['element-3', mockLineElement()],
            ['element-4', mockTextElement()],
            ['element-5', mockTextElement()],
          ],
        ],
      ],
    }));
    const activeWhiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboard.getSlide('slide-0');

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

  /**
   * Renders the colour picker, selects some elements and sets their colours.
   *
   * @param elementIds - ID of the elements to set the colour for
   * @param color - HEX code of the colour to set
   */
  async function renderColorPickerAndSetElementColors(
    elementIds: string[],
    color: string,
  ) {
    activeSlide.setActiveElementIds(elementIds);
    render(<ColorPicker />, { wrapper: Wrapper });
    await userEvent.click(screen.getByRole('button', { name: 'Pick a color' }));
    const grid = await screen.findByRole('grid', { name: 'Colors' });
    await userEvent.click(within(grid).getByRole('button', { name: color }));
  }

  it('should set the colour for a single selected shape element', async () => {
    await renderColorPickerAndSetElementColors(['element-1'], 'Red');

    expect(selectElementColors(activeSlide)).toEqual({
      'element-0': green[500],
      'element-1': red[500],
      'element-2': grey[500],
      'element-3': '#ffffff',
      'element-4': 'transparent',
      'element-5': 'transparent',
    });
  });

  it('should set the colour for a single selected path element', async () => {
    await renderColorPickerAndSetElementColors(['element-2'], 'Red');

    expect(selectElementColors(activeSlide)).toEqual({
      'element-0': green[500],
      'element-1': '#ffffff',
      'element-2': red[500],
      'element-3': '#ffffff',
      'element-4': 'transparent',
      'element-5': 'transparent',
    });
  });

  it('should set the colour for multiple selected elements but not for text elements', async () => {
    await renderColorPickerAndSetElementColors(
      ['element-1', 'element-2', 'element-4'],
      'Red',
    );

    expect(selectElementColors(activeSlide)).toEqual({
      'element-0': green[500],
      'element-1': red[500],
      'element-2': red[500],
      'element-3': '#ffffff',
      'element-4': 'transparent',
      'element-5': 'transparent',
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

  it('should be hidden when only text elements are selected', async () => {
    activeSlide.setActiveElementIds(['element-4', 'element-5']);
    render(<ColorPicker />, { wrapper: Wrapper });
    const colorButton = screen.queryByRole('button', { name: 'Pick a color' });

    expect(colorButton).not.toBeInTheDocument();
  });
});

/**
 * Extracts a map from element ID to the element colour.
 *
 * @param activeSlide - The slide to get the element, color map of
 * @returns Record that maps element ID to the element colour
 */
function selectElementColors(
  activeSlide: WhiteboardSlideInstance,
): Record<string, string | undefined> {
  const elementColors: Record<string, string | undefined> = {};
  for (const elementId of activeSlide.getElementIds()) {
    const element = activeSlide.getElement(elementId);
    if (element) {
      elementColors[elementId] =
        element.type === 'shape'
          ? element.fillColor
          : element.type === 'path'
            ? element.strokeColor
            : undefined;
    }
  }
  return elementColors;
}
