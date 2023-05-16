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
import { axe } from 'jest-axe';
import { ComponentType, PropsWithChildren } from 'react';
import {
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from '../../state';
import { LayoutStateProvider } from '../Layout';
import { UndoRedoBar } from './UndoRedoBar';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<UndoRedoBar/>', () => {
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
    render(<UndoRedoBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Undo' });

    expect(
      within(toolbar).getByRole('button', { name: 'Undo' })
    ).toBeInTheDocument();

    expect(
      within(toolbar).getByRole('button', { name: 'Redo' })
    ).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<UndoRedoBar />, { wrapper: Wrapper });

    expect(await axe(container)).toHaveNoViolations();
  });

  it('should undo and redo the latest change', async () => {
    render(<UndoRedoBar />, { wrapper: Wrapper });

    const toolbar = screen.getByRole('toolbar', { name: 'Undo' });
    const undoButton = within(toolbar).getByRole('button', { name: 'Undo' });
    const redoButton = within(toolbar).getByRole('button', { name: 'Redo' });

    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();

    act(() => {
      whiteboardManager.getActiveWhiteboardInstance()?.addSlide();
    });

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(2);
    expect(undoButton).toBeEnabled();
    expect(redoButton).toBeDisabled();

    await userEvent.click(undoButton);

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(1);
    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeEnabled();

    await userEvent.click(redoButton);

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(2);
    expect(undoButton).toBeEnabled();
    expect(redoButton).toBeDisabled();
  });
});
