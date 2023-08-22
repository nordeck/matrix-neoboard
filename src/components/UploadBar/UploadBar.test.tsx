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
import { render, screen, within } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from '../../state';
import { LayoutStateProvider } from '../Layout';
import { UploadBar } from './UploadBar';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<UploadBar/>', () => {
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager());

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      </LayoutStateProvider>
    );
  });

  it('should render without exploding', () => {
    render(<UploadBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Upload' });

    expect(
      within(toolbar).getByRole('button', { name: 'Upload' })
    ).toBeInTheDocument();
  });

  it('should disabled all buttons if the slide is locked', () => {
    whiteboardManager
      .getActiveWhiteboardInstance()
      ?.getSlide('slide-0')
      .lockSlide();

    render(<UploadBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Upload' });

    expect(
      within(toolbar).getByRole('button', { name: 'Upload' })
    ).toBeDisabled();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<UploadBar />, { wrapper: Wrapper });

    expect(await axe(container)).toHaveNoViolations();
  });

  it.todo('should upload image');
});
