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
import {
  act,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType, PropsWithChildren } from 'react';
import { firstValueFrom, take, toArray } from 'rxjs';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  Mocked,
  vi,
} from 'vitest';
import {
  mockLineElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../lib/testUtils';
import { WhiteboardInstance, WhiteboardManager } from '../../state';
import * as constants from '../Whiteboard/constants';
import { SlidesMigration } from './SlidesMigration';

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

let widgetApi: MockedWidgetApi;

afterEach(() => {
  widgetApi.stop();
});

beforeEach(() => {
  vi.mocked(getEnvironment).mockImplementation(
    (_, defaultValue) => defaultValue,
  );

  widgetApi = mockWidgetApi();

  // @ts-ignore forcefully set for tests
  widgetApi.widgetParameters.baseUrl = 'https://example.com';
});

describe('<SlidesMigration/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        ['slide-0', [['element-0', mockLineElement()]]],
        ['slide-1', [['element-2', mockLineElement()]]],
      ],
    }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

    Wrapper = ({ children }) => {
      return (
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      );
    };
  });

  it('should render a dialog to migrate slides to frames in infinite canvas mode', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    render(<SlidesMigration />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    expect(dialog).toBeInTheDocument();

    expect(
      within(dialog).getByRole('button', { name: 'Download' }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'Migrate' }),
    ).toBeDisabled();
  });

  it('should not render a dialog to migrate slides to frames', async () => {
    render(<SlidesMigration />, {
      wrapper: Wrapper,
    });

    const dialog = screen.queryByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    expect(dialog).not.toBeInTheDocument();
  });

  it('should download existing whiteboard content', async () => {
    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    const blobSpy = vi.spyOn(global, 'Blob').mockReturnValue({
      size: 0,
      type: '',
      arrayBuffer: vi.fn(),
      slice: vi.fn(),
      stream: vi.fn(),
      text: vi.fn(),
    } as unknown as Blob);

    render(<SlidesMigration />, { wrapper: Wrapper });

    const dialog = screen.getByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Download' }),
    );

    await waitFor(() => {
      expect(blobSpy).toHaveBeenCalledWith([
        JSON.stringify({
          version: 'net.nordeck.whiteboard@v1',
          whiteboard: {
            slides: [
              {
                elements: [mockLineElement()],
              },
              {
                elements: [mockLineElement()],
              },
            ],
          },
        }),
      ]);
    });
  });

  it('should migrate slides to frames', async () => {
    vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
    vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    const undoRedoStates = firstValueFrom(
      activeWhiteboardInstance.observeUndoRedoState().pipe(take(3), toArray()),
    );

    render(<SlidesMigration />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Download' }),
    );

    const button = within(dialog).getByRole('button', { name: 'Migrate' });
    await userEvent.click(button);

    expect(button).toBeDisabled();

    await waitForElementToBeRemoved(dialog);

    expect(activeWhiteboardInstance.getSlideIds().length).toBe(1);
    expect(
      activeWhiteboardInstance.getActiveSlide()?.getFrameElementIds().length,
    ).toBe(2);
    expect(
      activeWhiteboardInstance.getActiveSlide()?.getElementIds().length,
    ).toBe(4);

    expect(await undoRedoStates).toEqual([
      { canUndo: false, canRedo: false }, // at start
      { canUndo: true, canRedo: false }, // after migration
      { canUndo: false, canRedo: false }, // after clear undo manager
    ]);
  });

  it('should show error if cannot migrate slides to frames', async () => {
    vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
    vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    vi.spyOn(
      activeWhiteboardInstance,
      'transformSlidesToFrames',
    ).mockImplementation(() => {
      throw new Error('Something broke');
    });

    render(<SlidesMigration />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Download' }),
    );

    const migrateButton = within(dialog).getByRole('button', {
      name: 'Migrate',
    });
    await userEvent.click(migrateButton);

    expect(migrateButton).toBeDisabled();

    const alert = await screen.findByRole('alert');
    expect(
      within(alert).getByText('Failed to migrate the slides'),
    ).toBeInTheDocument();
  });

  it('should render a dialog to migrate slides when a new slide added after migration', async () => {
    vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(19200);
    vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(10800);

    vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
      name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
    );

    render(<SlidesMigration />, {
      wrapper: Wrapper,
    });

    const dialog = screen.getByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Download' }),
    );

    const migrateButton = within(dialog).getByRole('button', {
      name: 'Migrate',
    });
    await userEvent.click(migrateButton);

    expect(migrateButton).toBeDisabled();

    await waitForElementToBeRemoved(dialog);

    expect(activeWhiteboardInstance.getSlideIds().length).toBe(1);

    act(() => {
      activeWhiteboardInstance.addSlide();
    });

    const dialog1 = await screen.findByRole('dialog', {
      name: 'Migrate slides to frames',
    });

    const migrateButton1 = within(dialog1).getByRole('button', {
      name: 'Migrate',
    });
    expect(migrateButton1).toBeDisabled();
  });
});
