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
import { render, screen } from '@testing-library/react';
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
} from '../../../lib/testUtils';
import { WhiteboardSlideInstance } from '../../../state';
import { Toolbar } from '../../common/Toolbar';
import { TextUnderlineButton } from './TextUnderlineButton';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<TextUnderlineButton />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let slide: WhiteboardSlideInstance;

  beforeEach(() => {
    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide',
          [
            [
              'rectangle',
              mockRectangleElement({ text: 'Hello', textUnderline: false }),
            ],
            [
              'circle',
              mockCircleElement({ text: 'Hello', textUnderline: true }),
            ],
            [
              'triangle',
              mockTriangleElement({ text: 'Hello', textUnderline: false }),
            ],
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
    render(<TextUnderlineButton />, { wrapper: Wrapper });
    expect(
      screen.getByRole('checkbox', { name: 'Underline' }),
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<TextUnderlineButton />, { wrapper: Wrapper });
    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should reflect the underline text state of the first element', () => {
    render(<TextUnderlineButton />, { wrapper: Wrapper });
    expect(
      screen.getByRole('checkbox', { name: 'Underline' }),
    ).not.toBeChecked();
  });

  // Only test one toggle case here.
  // The rest is covered by useToggleUnderline hook tests.
  it('should switch Underline text for one element', async () => {
    slide.setActiveElementId('rectangle');
    render(<TextUnderlineButton />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole('checkbox', { name: 'Underline' }));

    expect(slide.getElement('rectangle')).toEqual(
      expect.objectContaining({ textUnderline: true }),
    );
  });
});
