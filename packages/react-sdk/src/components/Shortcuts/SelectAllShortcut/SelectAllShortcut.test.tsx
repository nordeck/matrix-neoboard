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
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  mockEllipseElement,
  mockFrameElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils';
import { WhiteboardInstance, WhiteboardManager } from '../../../state';
import {
  HOTKEY_SCOPE_WHITEBOARD,
  WhiteboardHotkeysProvider,
  usePauseHotkeysScope,
} from '../../WhiteboardHotkeysProvider';
import { SelectAllShortcut } from './SelectAllShortcut';

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<SelectAllShortcut>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;
  let setPresentationMode: (
    enable: boolean,
    enableEdit?: boolean,
    presentationType?: 'presentation' | 'presenting',
  ) => void;

  beforeEach(() => {
    vi.mocked(getEnvironment).mockImplementation(
      (_, defaultValue) => defaultValue,
    );

    ({ whiteboardManager, setPresentationMode } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockLineElement()],
            ['element-1', mockEllipseElement()],
            [
              'frame-0',
              mockFrameElement({
                position: { x: 500, y: 500 },
                width: 300,
                height: 300,
              }),
            ],
          ],
        ],
      ],
    }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

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

  it.each(['{Control>}a{/Control}', '{meta>}a{/meta}'])(
    'should select all elements including frames with %s',
    async (key) => {
      const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard(key);

      expect(activeSlide.getActiveElementIds()).toEqual([
        'element-0',
        'element-1',
        'frame-0',
      ]);
    },
  );

  it('should ignore select all if keyboard scope is disabled', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

    render(
      <DisableWhiteboardHotkeys>
        <SelectAllShortcut />
      </DisableWhiteboardHotkeys>,
      { wrapper: Wrapper },
    );

    await userEvent.keyboard('{Control>}a{/Control}');

    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  it('should ignore select all if the presentation mode is active', async () => {
    setPresentationMode(true, false);

    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

    render(<SelectAllShortcut />, { wrapper: Wrapper });

    await userEvent.keyboard('{Control>}a{/Control}');

    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  it('should select all elements including frames when presentation mode is active with edit enabled', async () => {
    setPresentationMode(true, true);

    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

    render(<SelectAllShortcut />, { wrapper: Wrapper });

    await userEvent.keyboard('{Control>}a{/Control}');

    expect(activeSlide.getActiveElementIds()).toEqual([
      'element-0',
      'element-1',
      'frame-0',
    ]);
  });

  describe('in infinite canvas mode', () => {
    beforeEach(() => {
      vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
        name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
      );

      // element-0 and element-1 are attached to frame-0 via attachedFrame;
      // element-2 belongs to no frame.
      ({ whiteboardManager, setPresentationMode } = mockWhiteboardManager({
        slides: [
          [
            'slide-0',
            [
              ['element-0', mockLineElement({ attachedFrame: 'frame-0' })],
              ['element-1', mockEllipseElement({ attachedFrame: 'frame-0' })],
              ['element-2', mockEllipseElement()],
              [
                'frame-0',
                mockFrameElement({
                  position: { x: 0, y: 0 },
                  width: 1000,
                  height: 1000,
                }),
              ],
            ],
          ],
        ],
      }));
      activeWhiteboardInstance =
        whiteboardManager.getActiveWhiteboardInstance()!;
    });

    it('should select all elements including frames when not in presentation mode', async () => {
      const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([
        'element-0',
        'element-1',
        'element-2',
        'frame-0',
      ]);
    });

    it('should select only elements inside the active frame when the presentee is in edit mode', async () => {
      setPresentationMode(true, true);

      const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([
        'element-0',
        'element-1',
      ]);
    });

    it('should ignore select all when the presentee is not in edit mode', async () => {
      setPresentationMode(true, false);

      const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([]);
    });

    it('should select only elements inside the active frame when the presenter is in edit mode', async () => {
      setPresentationMode(true, true, 'presenting');

      const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([
        'element-0',
        'element-1',
      ]);
    });

    it('should select only elements inside the active frame when the presenter is not in edit mode', async () => {
      setPresentationMode(true, false, 'presenting');

      const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([
        'element-0',
        'element-1',
      ]);
    });
  });
});

function DisableWhiteboardHotkeys({ children }: PropsWithChildren<{}>) {
  usePauseHotkeysScope(HOTKEY_SCOPE_WHITEBOARD);
  return <>{children}</>;
}
