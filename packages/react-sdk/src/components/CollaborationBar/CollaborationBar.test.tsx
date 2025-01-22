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
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { ComponentType, PropsWithChildren } from 'react';
import { Mocked, afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from '../../state';
import { LayoutStateProvider } from '../Layout';
import { WhiteboardHotkeysProvider } from '../WhiteboardHotkeysProvider';
import { CollaborationBar } from './CollaborationBar';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<CollaborationBar>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let setPresentationMode: (enable: boolean, enableEdit: boolean) => void;

  beforeEach(() => {
    ({ whiteboardManager, setPresentationMode } = mockWhiteboardManager());

    Wrapper = ({ children }) => (
      <WhiteboardHotkeysProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <LayoutStateProvider>{children}</LayoutStateProvider>
        </WhiteboardTestingContextProvider>
      </WhiteboardHotkeysProvider>
    );
  });

  it('should render without exploding', async () => {
    render(<CollaborationBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Collaboration' });

    await act(async () => {
      expect(
        within(toolbar).getByRole('checkbox', {
          name: "Hide collaborators' cursors",
          checked: true,
        }),
      ).toBeInTheDocument();
      expect(
        within(toolbar).getByRole('button', { name: '@user-id (You)' }),
      ).toBeInTheDocument();
    });
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<CollaborationBar />, { wrapper: Wrapper });

    await act(async () => {
      expect(await axe.run(container)).toHaveNoViolations();
    });
  });

  it('should provide anchor for the guided tour', async () => {
    render(<CollaborationBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Collaboration' });

    await act(async () => {
      expect(toolbar).toHaveAttribute(
        'data-guided-tour-target',
        'collaborationbar',
      );
    });
  });

  it('should toggle show cursors', async () => {
    render(<CollaborationBar />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('checkbox', {
        name: "Hide collaborators' cursors",
        checked: true,
      }),
    );

    expect(
      screen.getByRole('checkbox', {
        name: "Show collaborators' cursors",
        checked: false,
      }),
    ).toBeInTheDocument();
  });

  it('should show cursors checkbox in presentation mode if edit mode is enabled', async () => {
    setPresentationMode(true, true);

    render(<CollaborationBar />, { wrapper: Wrapper });

    expect(
      screen.getByRole('checkbox', { name: /cursors$/ }),
    ).toBeInTheDocument();
  });

  it('should hide cursors checkbox in presentation mode if edit mode is not enabled', async () => {
    setPresentationMode(true, false);

    render(<CollaborationBar />, { wrapper: Wrapper });

    await act(async () => {
      expect(
        screen.queryByRole('checkbox', { name: /cursors$/ }),
      ).not.toBeInTheDocument();
    });
  });
});
