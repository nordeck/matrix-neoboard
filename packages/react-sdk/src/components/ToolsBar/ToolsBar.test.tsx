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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { mocked } from 'jest-mock';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from '../../state';
import { ImageUploadProvider } from '../ImageUpload';
import { LayoutStateProvider } from '../Layout';
import { SnackbarProvider } from '../Snackbar';
import { ToolsBar } from './ToolsBar';

jest.mock('@matrix-widget-toolkit/mui', () => ({
  ...jest.requireActual('@matrix-widget-toolkit/mui'),
  getEnvironment: jest.fn(),
}));

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<ToolsBar/>', () => {
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager());

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <SnackbarProvider>
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            <ImageUploadProvider>{children}</ImageUploadProvider>
          </WhiteboardTestingContextProvider>
        </SnackbarProvider>
      </LayoutStateProvider>
    );
  });

  it('should render without exploding', () => {
    render(<ToolsBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Tools' });
    const radiogroup = within(toolbar).getByRole('radiogroup', {
      name: 'Tools',
    });

    expect(
      within(radiogroup).getByRole('radio', { name: 'Select' }),
    ).toBeChecked();
    expect(
      within(radiogroup).getByRole('radio', { name: 'Text' }),
    ).not.toBeChecked();
    expect(
      within(radiogroup).getByRole('radio', { name: 'Pen' }),
    ).not.toBeChecked();
    expect(
      within(radiogroup).getByRole('radio', { name: 'Ellipse' }),
    ).not.toBeChecked();
    expect(
      within(radiogroup).getByRole('radio', { name: 'Rectangle' }),
    ).not.toBeChecked();
    expect(
      within(radiogroup).getByRole('radio', { name: 'Triangle' }),
    ).not.toBeChecked();
    expect(
      within(radiogroup).getByRole('radio', { name: 'Line' }),
    ).not.toBeChecked();
    expect(
      within(radiogroup).getByRole('radio', { name: 'Arrow' }),
    ).not.toBeChecked();
    expect(
      screen.queryByRole('presentation', { name: 'Upload image' }),
    ).not.toBeInTheDocument();
  });

  it('should render the upload image too if REACT_APP_IMAGES = true', () => {
    mocked(getEnvironment).mockImplementation((name) => {
      return name === 'REACT_APP_IMAGES' ? 'true' : 'false';
    });

    render(<ToolsBar />, { wrapper: Wrapper });

    expect(
      screen.getByRole('presentation', { name: 'Upload image' }),
    ).toBeInTheDocument();
  });

  it('should provide anchor for the guided tour', () => {
    render(<ToolsBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Tools' });

    expect(toolbar).toHaveAttribute('data-guided-tour-target', 'toolsbar');
  });

  it('should disable all buttons if the slide is locked and not active', () => {
    mocked(getEnvironment).mockImplementation((name) => {
      return name === 'REACT_APP_IMAGES' ? 'true' : 'false';
    });

    whiteboardManager
      .getActiveWhiteboardInstance()
      ?.getSlide('slide-0')
      .lockSlide();

    render(<ToolsBar />, { wrapper: Wrapper });

    expect(screen.getByRole('radio', { name: 'Select' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Text' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Pen' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Ellipse' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Rectangle' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Triangle' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Line' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Arrow' })).toBeDisabled();
    expect(
      screen.getByRole('presentation', { name: 'Upload image' }),
    ).toBeDisabled();

    expect(screen.getByRole('radio', { name: 'Select' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Text' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Pen' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Ellipse' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Rectangle' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Triangle' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Line' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Arrow' })).not.toBeChecked();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<ToolsBar />, { wrapper: Wrapper });

    expect(await axe(container)).toHaveNoViolations();
  });

  it('should switch to the pen tool', async () => {
    render(<ToolsBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Tools' });
    const radiogroup = within(toolbar).getByRole('radiogroup', {
      name: 'Tools',
    });

    const penTool = within(radiogroup).getByRole('radio', {
      name: 'Pen',
      checked: false,
    });

    await userEvent.click(penTool);

    expect(penTool).toBeChecked();
  });
});
