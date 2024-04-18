/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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
import { red } from '@mui/material/colors';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardManager, WhiteboardSlideInstance } from '../../../state';
import { LayoutStateProvider } from '../../Layout';
import { Toolbar } from '../../common/Toolbar';
import { TextColorPicker } from './TextColorPicker';

describe('TextColorPicker', () => {
  let widgetApi: MockedWidgetApi;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let activeSlide: WhiteboardSlideInstance;

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            // empty text
            ['element-0', mockEllipseElement()],
            // non-text element
            ['element-1', mockLineElement()],
            [
              'element-2',
              mockEllipseElement({ text: 'test', textColor: red[300] }),
            ],
            [
              'element-3',
              mockEllipseElement({ text: 'test', textColor: red[500] }),
            ],
          ],
        ],
      ],
    }));
    const activeWhiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboard.getSlide('slide-0');

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <Toolbar>{children}</Toolbar>
        </WhiteboardTestingContextProvider>
      </LayoutStateProvider>
    );
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should set the text color for selected elements with a text', async () => {
    activeSlide.setActiveElementIds([
      'element-0',
      'element-1',
      'element-2',
      'element-3',
    ]);
    render(<TextColorPicker />, { wrapper: Wrapper });
    await userEvent.click(
      screen.getByRole('button', { name: 'Pick a text color' }),
    );
    const grid = await screen.findByRole('grid', { name: 'Colors' });
    await userEvent.click(within(grid).getByRole('button', { name: 'Green' }));

    expect(selectTextColors(activeSlide)).toEqual({
      'element-0': undefined,
      'element-1': undefined,
      'element-2': '#4caf50',
      'element-3': '#4caf50',
    });
  });

  it('should be hidden for elements without a text prop', () => {
    activeSlide.setActiveElementIds(['element-1']);
    render(<TextColorPicker />, { wrapper: Wrapper });
    const colorButton = screen.queryByRole('button', {
      name: 'Pick a text color',
    });

    expect(colorButton).not.toBeInTheDocument();
  });
});

function selectTextColors(activeSlide: WhiteboardSlideInstance) {
  const textColors: Record<string, string | undefined> = {};

  for (const elementId of activeSlide.getElementIds()) {
    const element = activeSlide.getElement(elementId);

    if (element && 'textColor' in element) {
      textColors[elementId] = element.textColor;
    } else {
      textColors[elementId] = undefined;
    }
  }

  return textColors;
}
