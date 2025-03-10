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
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import {
  Mocked,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from '../../state';
import { ImageUploadProvider } from '../ImageUpload';
import { LayoutStateProvider } from '../Layout';
import { SnackbarProvider } from '../Snackbar';
import * as whiteboardConstants from '../Whiteboard/constants';
import { ToolsBar } from './ToolsBar';

let widgetApi: MockedWidgetApi;

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

afterEach(() => {
  widgetApi.stop();
  vi.restoreAllMocks();
});

describe('<ToolsBar/>', () => {
  let whiteboardManager: Mocked<WhiteboardManager>;
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
      within(radiogroup).getByRole('radio', { name: 'Rounded rectangle' }),
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
      screen.getByRole('button', { name: 'Upload image' }),
    ).toBeInTheDocument();
  });

  it('should render the upload image', () => {
    render(<ToolsBar />, { wrapper: Wrapper });

    expect(
      screen.getByRole('button', { name: 'Upload image' }),
    ).toBeInTheDocument();
  });

  it('should provide anchor for the guided tour', () => {
    render(<ToolsBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Tools' });

    expect(toolbar).toHaveAttribute('data-guided-tour-target', 'toolsbar');
  });

  it('should disable all buttons if the slide is locked and not active', () => {
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
    expect(
      screen.getByRole('radio', { name: 'Rounded rectangle' }),
    ).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Triangle' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Line' })).toBeDisabled();
    expect(screen.getByRole('radio', { name: 'Arrow' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Upload image' })).toBeDisabled();

    expect(screen.getByRole('radio', { name: 'Select' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Text' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Pen' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Ellipse' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Rectangle' })).not.toBeChecked();
    expect(
      screen.getByRole('radio', { name: 'Rounded rectangle' }),
    ).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Triangle' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Line' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'Arrow' })).not.toBeChecked();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<ToolsBar />, { wrapper: Wrapper });

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should switch to the pen tool and unselect elements', async () => {
    const slide = whiteboardManager
      .getActiveWhiteboardInstance()
      ?.getSlide('slide-0');

    slide?.setActiveElementIds(['element-0']);
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
    expect(slide?.getActiveElementIds()).toEqual([]);
  });

  it('should not show the create frame button per default', () => {
    render(<ToolsBar />, { wrapper: Wrapper });

    expect(
      screen.queryByRole('button', { name: 'Create frame' }),
    ).not.toBeInTheDocument();
  });

  it('should show the create frame button, if infinite canvas is enabled', () => {
    vi.spyOn(whiteboardConstants, 'infiniteCanvasMode', 'get').mockReturnValue(
      true,
    );

    render(<ToolsBar />, { wrapper: Wrapper });

    expect(
      screen.getByRole('button', { name: 'Create frame' }),
    ).toBeInTheDocument();
  });
});
