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
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from '../../../state';
import { Toolbar } from '../../common/Toolbar';
import { TextAlignmentButtons } from './TextAlignmentButtons';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<TextAlignmentButtons/>', () => {
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockEllipseElement()],
            ['element-1', mockLineElement()],
          ],
        ],
      ],
    }));
    whiteboardManager
      .getActiveWhiteboardInstance()
      ?.getSlide('slide-0')
      .setActiveElementId('element-0');

    Wrapper = ({ children }) => (
      <WhiteboardTestingContextProvider
        whiteboardManager={whiteboardManager}
        widgetApi={widgetApi}
      >
        <Toolbar>{children}</Toolbar>
      </WhiteboardTestingContextProvider>
    );
  });

  it('should render without exploding', async () => {
    render(<TextAlignmentButtons />, { wrapper: Wrapper });

    const radioGroup = screen.getByRole('radiogroup', {
      name: 'Text Alignment',
    });

    expect(
      within(radioGroup).getByRole('radio', { name: 'Left' }),
    ).not.toBeChecked();
    expect(
      within(radioGroup).getByRole('radio', { name: 'Center' }),
    ).toBeChecked();
    expect(
      within(radioGroup).getByRole('radio', { name: 'Right' }),
    ).not.toBeChecked();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<TextAlignmentButtons />, {
      wrapper: Wrapper,
    });

    expect(
      screen.getByRole('radiogroup', { name: 'Text Alignment' }),
    ).toBeInTheDocument();

    expect(await axe(container)).toHaveNoViolations();
  });

  it('should show selected alignment', async () => {
    whiteboardManager
      .getActiveWhiteboardInstance()
      ?.getSlide('slide-0')
      .updateElement('element-0', { textAlignment: 'left' });

    render(<TextAlignmentButtons />, { wrapper: Wrapper });

    expect(screen.getByRole('radio', { name: 'Left' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Center' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Right' })).not.toBeChecked();
  });

  it('should hide for non-shape elements', async () => {
    render(<TextAlignmentButtons />, { wrapper: Wrapper });

    const radioGroup = screen.getByRole('radiogroup', {
      name: 'Text Alignment',
    });

    act(() => {
      whiteboardManager
        .getActiveWhiteboardInstance()
        ?.getSlide('slide-0')
        .setActiveElementId('element-1');
    });

    await waitFor(() => {
      expect(radioGroup).not.toBeInTheDocument();
    });
  });

  it('should switch the text alignment', async () => {
    render(<TextAlignmentButtons />, { wrapper: Wrapper });

    await userEvent.click(screen.getByRole('radio', { name: 'Right' }));

    expect(
      whiteboardManager
        .getActiveWhiteboardInstance()
        ?.getSlide('slide-0')
        .getElement('element-0'),
    ).toEqual(expect.objectContaining({ textAlignment: 'right' }));
  });
});
