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

import { render, screen, within } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { mockFullscreenApi } from '../../lib/testUtils/documentTestUtils';
import { LayoutStateProvider } from '../Layout';
import { FullscreenModeBar } from './FullscreenModeBar';

describe('<FullscreenModeBar/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;

  beforeEach(() => {
    mockFullscreenApi();

    Wrapper = ({ children }) => (
      <LayoutStateProvider>{children}</LayoutStateProvider>
    );
  });

  it('should render without exploding', () => {
    render(<FullscreenModeBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Fullscreen mode' });

    expect(
      within(toolbar).getByRole('checkbox', {
        name: 'Enable fullscreen mode',
      }),
    ).toBeInTheDocument();
  });
});
