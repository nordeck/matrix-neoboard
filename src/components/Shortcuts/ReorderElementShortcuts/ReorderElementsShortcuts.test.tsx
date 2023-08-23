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
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardInstance, WhiteboardManager } from '../../../state';
import { WhiteboardHotkeysProvider } from '../../WhiteboardHotkeysProvider';
import { ReorderElementsShortcuts } from './ReorderElementsShortcuts';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('<ReorderElementsShortcuts>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockLineElement()],
            ['element-1', mockEllipseElement()],
            ['element-2', mockEllipseElement({ text: 'Hello World' })],
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

  it('should move element forward to the top and stay on top on windows', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementId('element-1');
    render(<ReorderElementsShortcuts />, { wrapper: Wrapper });

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-1',
      'element-2',
    ]);

    await userEvent.keyboard('{Control>}{ArrowUp}');

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-2',
      'element-1',
    ]);

    // no effect if the element is already at the top
    await userEvent.keyboard('{Control>}{ArrowUp}');

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-2',
      'element-1',
    ]);
  });

  it('should move element forward to the top and stay on top on mac', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementId('element-1');
    render(<ReorderElementsShortcuts />, { wrapper: Wrapper });

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-1',
      'element-2',
    ]);

    await userEvent.keyboard('{meta>}{ArrowUp}');

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-2',
      'element-1',
    ]);

    // no effect if the element is already at the top
    await userEvent.keyboard('{meta>}{ArrowUp}');

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-2',
      'element-1',
    ]);
  });

  it('should move element backward to the bottom and stay on bottom on windows', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementId('element-1');
    render(<ReorderElementsShortcuts />, { wrapper: Wrapper });

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-1',
      'element-2',
    ]);

    await userEvent.keyboard('{Control>}{ArrowDown}');

    expect(activeSlide.getElementIds()).toEqual([
      'element-1',
      'element-0',
      'element-2',
    ]);

    // no effect if the element is already at the top
    await userEvent.keyboard('{Control>}{ArrowDown}');

    expect(activeSlide.getElementIds()).toEqual([
      'element-1',
      'element-0',
      'element-2',
    ]);
  });

  it('should move element backward to the bottom and stay on bottom on mac', async () => {
    const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
    activeSlide.setActiveElementId('element-1');
    render(<ReorderElementsShortcuts />, { wrapper: Wrapper });

    expect(activeSlide.getElementIds()).toEqual([
      'element-0',
      'element-1',
      'element-2',
    ]);

    await userEvent.keyboard('{meta>}{ArrowDown}');

    expect(activeSlide.getElementIds()).toEqual([
      'element-1',
      'element-0',
      'element-2',
    ]);

    // no effect if the element is already at the top
    await userEvent.keyboard('{meta>}{ArrowDown}');

    expect(activeSlide.getElementIds()).toEqual([
      'element-1',
      'element-0',
      'element-2',
    ]);
  });
});
