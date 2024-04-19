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
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
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
import { TextBoldButton } from './TextBoldButton';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<TextBoldButton />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let slide: WhiteboardSlideInstance;

  beforeEach(() => {
    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide',
          [
            ['rectangle', mockRectangleElement({ textBold: false })],
            ['circle', mockCircleElement({ textBold: true })],
            ['triangle', mockTriangleElement({ textBold: false })],
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
    render(<TextBoldButton />, { wrapper: Wrapper });
    expect(screen.getByRole('checkbox', { name: 'Bold' })).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<TextBoldButton />, { wrapper: Wrapper });
    expect(await axe(container)).toHaveNoViolations();
  });

  it('should reflect the bold text state of the first element', () => {
    render(<TextBoldButton />, { wrapper: Wrapper });
    expect(screen.getByRole('checkbox', { name: 'Bold' })).not.toBeChecked();
  });

  it('should hide for non-shape elements', async () => {
    render(<TextBoldButton />, { wrapper: Wrapper });

    const checkbox = screen.getByRole('checkbox', { name: 'Bold' });

    act(() => {
      slide.setActiveElementId('line');
    });

    await waitFor(() => {
      expect(checkbox).not.toBeInTheDocument();
    });
  });

  it('should switch bold text for one element', async () => {
    slide.setActiveElementId('rectangle');
    render(<TextBoldButton />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole('checkbox', { name: 'Bold' }));

    expect(slide.getElement('rectangle')).toEqual(
      expect.objectContaining({ textBold: true }),
    );
  });

  it('should switch bold text for several elements', async () => {
    render(<TextBoldButton />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole('checkbox', { name: 'Bold' }));

    expect(slide.getElement('rectangle')).toEqual(
      expect.objectContaining({ textBold: true }),
    );

    expect(slide.getElement('circle')).toEqual(
      expect.objectContaining({ textBold: true }),
    );

    expect(slide.getElement('triangle')).toEqual(
      expect.objectContaining({ textBold: true }),
    );
  });
});
