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
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockCircleElement,
  mockLineElement,
  mockRectangleElement,
  mockTriangleElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardSlideInstance } from '../../../state';
import { Toolbar } from '../../common/Toolbar';
import { TextItalicButton } from './TextItalicButton';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<TextItalicButton />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let slide: WhiteboardSlideInstance;

  beforeEach(() => {
    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide',
          [
            ['rectangle', mockRectangleElement({ textItalic: false })],
            ['circle', mockCircleElement({ textItalic: true })],
            ['triangle', mockTriangleElement({ textItalic: false })],
            ['line', mockLineElement()],
          ],
        ],
      ],
    });

    slide = whiteboardManager.getActiveWhiteboardInstance()!.getSlide('slide');
    slide.setActiveElementIds(['rectangle', 'circle', 'triangle', 'line']);

    Wrapper = ({ children }) => (
      <WhiteboardTestingContextProvider
        whiteboardManager={whiteboardManager}
        widgetApi={widgetApi}
      >
        <Toolbar>{children}</Toolbar>
      </WhiteboardTestingContextProvider>
    );
  });

  it('should render without exploding', () => {
    render(<TextItalicButton />, { wrapper: Wrapper });
    expect(
      screen.getByRole('checkbox', { name: 'Italic' }),
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<TextItalicButton />, { wrapper: Wrapper });
    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should reflect the italic text state of the first element', () => {
    render(<TextItalicButton />, { wrapper: Wrapper });
    expect(screen.getByRole('checkbox', { name: 'Italic' })).not.toBeChecked();
  });

  it('should hide for non-shape elements', async () => {
    render(<TextItalicButton />, { wrapper: Wrapper });

    const checkbox = screen.getByRole('checkbox', { name: 'Italic' });

    act(() => {
      slide.setActiveElementId('line');
    });

    await waitFor(() => {
      expect(checkbox).not.toBeInTheDocument();
    });
  });

  // Only test one toggle case here.
  // The rest is covered by useToggleItalic hook tests.
  it('should switch italic text for one element', async () => {
    slide.setActiveElementId('rectangle');
    render(<TextItalicButton />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole('checkbox', { name: 'Italic' }));

    expect(slide.getElement('rectangle')).toEqual(
      expect.objectContaining({ textItalic: true }),
    );
  });
});
