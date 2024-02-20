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

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType, PropsWithChildren } from 'react';
import { mockFullscreenApi } from '../../lib/testUtils/documentTestUtils';
import { LayoutStateProvider, useLayoutState } from '../Layout';
import { Toolbar } from '../common/Toolbar';
import { ToggleFullscreenModeButton } from './ToggleFullscreenButton';

describe('<ToggleFullscreenButton/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let setFullscreen: (fullscreen: boolean) => void;

  beforeEach(() => {
    function LayoutStateExtractor() {
      ({ setFullscreenMode: setFullscreen } = useLayoutState());
      return null;
    }

    mockFullscreenApi();

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <LayoutStateExtractor />
        <Toolbar>{children}</Toolbar>
      </LayoutStateProvider>
    );
  });

  it('should toggle from non-fullscreen to fullscreen mode', async () => {
    render(<ToggleFullscreenModeButton />, { wrapper: Wrapper });

    await userEvent.click(getEnableFullscreenModeButton());

    await waitFor(function () {
      expect(getDisableFullscreenModeButton()).toBeInTheDocument();
    });
  });

  it('should toggle from fullscreen to non-fullscreen mode', async () => {
    render(<ToggleFullscreenModeButton />, { wrapper: Wrapper });

    act(function () {
      setFullscreen(true);
    });

    await userEvent.click(getDisableFullscreenModeButton());

    await waitFor(function () {
      expect(getEnableFullscreenModeButton()).toBeInTheDocument();
    });
  });
});

function getEnableFullscreenModeButton() {
  return screen.getByRole('button', {
    name: 'Fullscreen on',
  });
}

function getDisableFullscreenModeButton() {
  return screen.getByRole('button', {
    name: 'Fullscreen off',
  });
}
