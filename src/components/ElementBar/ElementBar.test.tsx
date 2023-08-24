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
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';

import userEvent from '@testing-library/user-event';
import {
  mockEllipseElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardInstance, WhiteboardManager } from '../../state';
import { LayoutStateProvider } from '../Layout';
import { ElementBar } from './ElementBar';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<ElementBar/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', [['element-1', mockEllipseElement()]]]],
    }));

    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
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
    render(<ElementBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Element' });

    expect(
      within(toolbar).getByRole('button', {
        name: 'Pick a color',
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

  it('should delete an element', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    render(<ElementBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Element' });
    await userEvent.click(
      within(toolbar).getByRole('button', { name: /Delete element/ }),
    );

    expect(activeSlide.getElementIds()).toEqual([]);
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<ElementBar />, {
      wrapper: Wrapper,
    });

    expect(await axe(container)).toHaveNoViolations();
  });
});
