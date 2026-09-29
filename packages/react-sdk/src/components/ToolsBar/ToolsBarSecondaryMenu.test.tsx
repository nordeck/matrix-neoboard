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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils';
import { Point } from '../../state';
import { ConnectionPointProvider } from '../ConnectionPointProvider';
import { ElementOverridesProvider } from '../ElementOverridesProvider';
import { ImageUploadProvider } from '../ImageUpload';
import { LayoutStateProvider } from '../Layout';
import { PenElementBar } from '../PenElementBar';
import { SnackbarProvider } from '../Snackbar';
import { WhiteboardHost } from '../Whiteboard';
import * as constants from '../Whiteboard/constants';
import { WhiteboardHotkeysProvider } from '../WhiteboardHotkeysProvider';
import { ToolsBar } from './ToolsBar';
import { ToolsBarSecondaryMenu } from './ToolsBarSecondaryMenu';

vi.mock('../Whiteboard/SvgCanvas/useMeasure', () => ({
  useMeasure: vi.fn().mockReturnValue([vi.fn(), { width: 1920, height: 1080 }]),
}));

vi.mock('../Whiteboard/SvgCanvas/utils', async () => ({
  ...(await vi.importActual('../Whiteboard/SvgCanvas/utils')),
  calculateSvgCoords: (position: Point) => position,
}));

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

describe('ToolsBarSecondaryMenu', () => {
  let widgetApi: MockedWidgetApi;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    vi.mocked(getEnvironment).mockImplementation(
      (_, defaultValue) => defaultValue,
    );
    document.elementsFromPoint = vi.fn().mockReturnValue([]);

    widgetApi = mockWidgetApi();
    const { whiteboardManager } = mockWhiteboardManager();

    vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(false);
    vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(1920);
    vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(1080);

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <WhiteboardHotkeysProvider>
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            <ElementOverridesProvider>
              <ConnectionPointProvider>
                <SnackbarProvider>
                  <ImageUploadProvider>{children}</ImageUploadProvider>
                </SnackbarProvider>
              </ConnectionPointProvider>
            </ElementOverridesProvider>
          </WhiteboardTestingContextProvider>
        </WhiteboardHotkeysProvider>
      </LayoutStateProvider>
    );
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it('should render the item and secondary menu', () => {
    render(
      <ToolsBarSecondaryMenu
        item={<button>Item</button>}
        secondaryMenu={<PenElementBar />}
      />,
      { wrapper: Wrapper },
    );

    expect(screen.getByRole('button', { name: 'Item' })).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Pen' })).toBeInTheDocument();
  });

  it('should not render a secondary menu if none is provided', () => {
    render(<ToolsBarSecondaryMenu item={<button>Item</button>} />, {
      wrapper: Wrapper,
    });

    expect(screen.getByRole('button', { name: 'Item' })).toBeInTheDocument();
    expect(
      screen.queryByTestId('tools-bar-secondary-menu-popper'),
    ).not.toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(
      <ToolsBarSecondaryMenu
        item={<button>Item</button>}
        secondaryMenu={<PenElementBar />}
      />,
      { wrapper: Wrapper },
    );

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should show the pen secondary menu with duplicate and delete buttons after drawing a line with the pen tool', async () => {
    render(
      <>
        <ToolsBar />
        <WhiteboardHost />
      </>,
      { wrapper: Wrapper },
    );

    expect(
      screen.queryByRole('toolbar', { name: 'Pen' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('radio', { name: 'Pen' }));

    const draftHandler = screen.getByTestId('draft-pointer-handler');
    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: draftHandler,
        coords: { clientX: 50, clientY: 100 },
      },
      {
        pointerName: 'mouse',
        target: draftHandler,
        coords: { clientX: 70, clientY: 120 },
      },
      {
        keys: '[/MouseLeft]',
        target: draftHandler,
      },
    ]);

    const penToolbar = screen.getByRole('toolbar', { name: 'Pen' });
    expect(
      within(penToolbar).getByRole('button', {
        name: 'Duplicate previous stroke',
      }),
    ).toBeInTheDocument();
    expect(
      within(penToolbar).getByRole('button', {
        name: 'Delete previous stroke',
      }),
    ).toBeInTheDocument();
  });
});
