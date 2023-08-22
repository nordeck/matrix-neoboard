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
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from '../../../state';
import {
  HOTKEY_SCOPE_WHITEBOARD,
  WhiteboardHotkeysProvider,
  usePauseHotkeysScope,
} from '../../WhiteboardHotkeysProvider';
import { UndoRedoShortcuts } from './UndoRedoShortcuts';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<UndoRedoShortcuts>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  let setPresentationMode: (enable: boolean) => void;

  beforeEach(() => {
    ({ whiteboardManager, setPresentationMode } = mockWhiteboardManager());

    Wrapper = ({ children }) => (
      <WhiteboardHotkeysProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          {children}
        </WhiteboardTestingContextProvider>
      </WhiteboardHotkeysProvider>
    );
  });

  afterEach(() => {
    // restore the mock on window.navigator.userAgent
    jest.restoreAllMocks();
  });

  it('should undo with ctrl+z', async () => {
    render(<UndoRedoShortcuts />, { wrapper: Wrapper });

    act(() => {
      whiteboardManager.getActiveWhiteboardInstance()?.addSlide();
    });

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(2);

    await userEvent.keyboard('{Control>}z{/Control}');

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(1);
  });

  it('should undo with meta+z on mac os', async () => {
    jest
      .spyOn(window.navigator, 'userAgent', 'get')
      .mockReturnValue('Mac OS (jsdom)');

    render(<UndoRedoShortcuts />, { wrapper: Wrapper });

    act(() => {
      whiteboardManager.getActiveWhiteboardInstance()?.addSlide();
    });

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(2);

    await userEvent.keyboard('{Meta>}z{/Meta}');

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(1);
  });

  it('should ignore undo if keyboard scope is disabled', async () => {
    render(
      <DisableWhiteboardHotkeys>
        <UndoRedoShortcuts />
      </DisableWhiteboardHotkeys>,
      { wrapper: Wrapper }
    );

    act(() => {
      whiteboardManager.getActiveWhiteboardInstance()?.addSlide();
    });

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(2);

    await userEvent.keyboard('{Control>}z{/Control}');

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(2);
  });

  it('should ignore undo if the presentation mode is active', async () => {
    setPresentationMode(true);

    render(<UndoRedoShortcuts />, { wrapper: Wrapper });

    act(() => {
      whiteboardManager.getActiveWhiteboardInstance()?.addSlide();
    });

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(2);

    await userEvent.keyboard('{Control>}z{/Control}');

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(2);
  });

  it.each(['{Control>}{Shift>}z{/Shift}{/Control}', '{Control>}y{/Control}'])(
    'should redo with %s',
    async (text) => {
      render(<UndoRedoShortcuts />, { wrapper: Wrapper });

      act(() => {
        whiteboardManager.getActiveWhiteboardInstance()?.addSlide();
        whiteboardManager.getActiveWhiteboardInstance()?.undo();
      });

      expect(
        whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
      ).toHaveLength(1);

      await userEvent.keyboard(text);

      expect(
        whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
      ).toHaveLength(2);
    }
  );

  it('should redo with meta+shift+z on mac os', async () => {
    jest
      .spyOn(window.navigator, 'userAgent', 'get')
      .mockReturnValue('Mac OS (jsdom)');

    render(<UndoRedoShortcuts />, { wrapper: Wrapper });

    act(() => {
      whiteboardManager.getActiveWhiteboardInstance()?.addSlide();
      whiteboardManager.getActiveWhiteboardInstance()?.undo();
    });

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(1);

    await userEvent.keyboard('{Meta>}{Shift>}z{/Shift}{/Meta}');

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(2);
  });

  it('should ignore redo if keyboard scope is disabled', async () => {
    render(
      <DisableWhiteboardHotkeys>
        <UndoRedoShortcuts />
      </DisableWhiteboardHotkeys>,
      { wrapper: Wrapper }
    );

    act(() => {
      whiteboardManager.getActiveWhiteboardInstance()?.addSlide();
      whiteboardManager.getActiveWhiteboardInstance()?.undo();
    });

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(1);

    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(1);
  });

  it('should ignore redo if the presentation mode is active', async () => {
    setPresentationMode(true);

    render(<UndoRedoShortcuts />, { wrapper: Wrapper });

    act(() => {
      whiteboardManager.getActiveWhiteboardInstance()?.addSlide();
      whiteboardManager.getActiveWhiteboardInstance()?.undo();
    });

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(1);

    await userEvent.keyboard('{Control>}{Shift>}z{/Shift}{/Control}');

    expect(
      whiteboardManager.getActiveWhiteboardInstance()?.getSlideIds()
    ).toHaveLength(1);
  });
});

function DisableWhiteboardHotkeys({ children }: PropsWithChildren<{}>) {
  usePauseHotkeysScope(HOTKEY_SCOPE_WHITEBOARD);
  return <>{children}</>;
}
