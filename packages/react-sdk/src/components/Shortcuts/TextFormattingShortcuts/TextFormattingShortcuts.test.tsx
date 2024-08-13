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

import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { render } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import {
  mockLineElement,
  mockRectangleElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardSlideInstance } from '../../../state';
import { Toolbar } from '../../common/Toolbar';
import { TextFormattingShortcuts } from './TextFormattingShortcuts';

import userEvent from '@testing-library/user-event';
import { WhiteboardHotkeysProvider } from '../../WhiteboardHotkeysProvider';
describe('<TextFormattingShortcuts />', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let slide: WhiteboardSlideInstance;
  let widgetApi: MockedWidgetApi;

  beforeEach(() => {
    widgetApi = mockWidgetApi();

    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide',
          [
            [
              'rectangle',
              mockRectangleElement({ textBold: false, textItalic: false }),
            ],
            ['line', mockLineElement()],
          ],
        ],
      ],
    });

    slide = whiteboardManager.getActiveWhiteboardInstance()!.getSlide('slide');
    slide.setActiveElementIds(['rectangle', 'line']);

    Wrapper = ({ children }) => (
      <WhiteboardHotkeysProvider>
        <WhiteboardTestingContextProvider
          whiteboardManager={whiteboardManager}
          widgetApi={widgetApi}
        >
          <Toolbar>{children}</Toolbar>
        </WhiteboardTestingContextProvider>
      </WhiteboardHotkeysProvider>
    );
  });

  afterEach(() => {
    widgetApi.stop();
  });

  it.each([['{Control>}b'], ['{Meta>}b']])(
    '%s should toggle bold',
    async (shortcut) => {
      render(<TextFormattingShortcuts />, { wrapper: Wrapper });

      await userEvent.keyboard(shortcut);
      expect(slide.getElement('rectangle')).toEqual(
        expect.objectContaining({ textBold: true }),
      );

      await userEvent.keyboard(shortcut);
      expect(slide.getElement('rectangle')).toEqual(
        expect.objectContaining({ textBold: false }),
      );
    },
  );

  it.each([['{Control>}i'], ['{Meta>}i']])(
    '%s should toggle italic',
    async (shortcut) => {
      render(<TextFormattingShortcuts />, { wrapper: Wrapper });

      await userEvent.keyboard(shortcut);
      expect(slide.getElement('rectangle')).toEqual(
        expect.objectContaining({ textItalic: true }),
      );

      await userEvent.keyboard(shortcut);
      expect(slide.getElement('rectangle')).toEqual(
        expect.objectContaining({ textItalic: false }),
      );
    },
  );
});
