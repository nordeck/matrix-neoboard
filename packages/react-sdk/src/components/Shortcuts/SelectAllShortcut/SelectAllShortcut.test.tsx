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
  DisableWhiteboardHotkeys,
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockFrameElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils';
import {
  WhiteboardInstance,
  WhiteboardManager,
  WhiteboardSlideInstance,
} from '../../../state';
import { WhiteboardHotkeysProvider } from '../../WhiteboardHotkeysProvider';
import { SelectAllShortcut } from './SelectAllShortcut';

let widgetApi: MockedWidgetApi;

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

afterEach(() => widgetApi.stop());

beforeEach(() => {
  vi.mocked(getEnvironment).mockImplementation(
    (_, defaultValue) => defaultValue,
  );

  widgetApi = mockWidgetApi();
});

describe('<SelectAllShortcut>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;
  let activeSlide: WhiteboardSlideInstance;

  let setPresentationMode: (
    enable: boolean,
    enableEdit?: boolean,
    presentationType?: 'presentation' | 'presenting',
  ) => void;

  beforeEach(() => {
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
                attachedElements: ['element-0', 'element-1'],
              }),
            ],
          ],
        ],
      ],
    }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboardInstance.getSlide('slide-0');

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
    'should select all elements with %s',
    async (key) => {
      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard(key);

      expect(activeSlide.getActiveElementIds()).toEqual([
        'element-0',
        'element-1',
        'element-2',
        'frame-0',
      ]);
    },
  );

  it('should ignore select all if keyboard scope is disabled', async () => {
    render(
      <DisableWhiteboardHotkeys>
        <SelectAllShortcut />
      </DisableWhiteboardHotkeys>,
      { wrapper: Wrapper },
    );

    await userEvent.keyboard('{Control>}a{/Control}');

    expect(activeSlide.getActiveElementIds()).toEqual([]);
  });

  describe('presentation mode for slides', () => {
    it('should ignore select all', async () => {
      setPresentationMode(true, false);

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([]);
    });

    it('should select all elements if edit is enabled', async () => {
      setPresentationMode(true, true);

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([
        'element-0',
        'element-1',
        'element-2',
        'frame-0',
      ]);
    });

    it('should select all elements if presenting', async () => {
      setPresentationMode(true, false, 'presenting');

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([
        'element-0',
        'element-1',
        'element-2',
        'frame-0',
      ]);
    });

    it('should select all elements if presenting if edit is enabled', async () => {
      setPresentationMode(true, true, 'presenting');

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([
        'element-0',
        'element-1',
        'element-2',
        'frame-0',
      ]);
    });
  });

  describe('presentation mode for frames', () => {
    beforeEach(() => {
      vi.mocked(getEnvironment).mockImplementation((name, defaultValue) =>
        name === 'REACT_APP_INFINITE_CANVAS' ? 'true' : defaultValue,
      );
    });

    it('should ignore select all', async () => {
      setPresentationMode(true, false);

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([]);
    });

    it('should select elements inside the active frame if edit is enabled', async () => {
      setPresentationMode(true, true);

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([
        'element-0',
        'element-1',
      ]);
    });

    it('should select elements inside the active frame if presenting', async () => {
      setPresentationMode(true, false, 'presenting');

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([
        'element-0',
        'element-1',
      ]);
    });

    it('should select no elements inside the active frame if presenting if frame has no elements attached', async () => {
      activeSlide.updateElements([
        {
          elementId: 'element-0',
          patch: {
            attachedFrame: undefined,
          },
        },
        {
          elementId: 'element-1',
          patch: {
            attachedFrame: undefined,
          },
        },
        {
          elementId: 'frame-0',
          patch: {
            attachedElements: undefined,
          },
        },
      ]);

      setPresentationMode(true, false, 'presenting');

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([]);
    });

    it('should select elements inside the active frame if presenting if edit is enabled', async () => {
      setPresentationMode(true, true, 'presenting');

      render(<SelectAllShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard('{Control>}a{/Control}');

      expect(activeSlide.getActiveElementIds()).toEqual([
        'element-0',
        'element-1',
      ]);
    });
  });
});
