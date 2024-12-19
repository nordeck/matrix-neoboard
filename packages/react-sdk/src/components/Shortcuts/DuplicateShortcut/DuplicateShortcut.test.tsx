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
import { Mocked, afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils/documentTestUtils';
import { WhiteboardInstance, WhiteboardManager } from '../../../state';
import { WhiteboardHotkeysProvider } from '../../WhiteboardHotkeysProvider';
import { DuplicateShortcut } from './DuplicateShortcut';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => {
  widgetApi = mockWidgetApi();
});

describe('<DuplicateShortcut>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: Mocked<WhiteboardManager>;
  let activeWhiteboardInstance: WhiteboardInstance;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockLineElement()],
            ['element-1', mockLineElement()],
            ['element-2', mockEllipseElement()],
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

  it.each([
    ['a single element', '{Control>}d{/Control}', ['element-1']],
    ['multiple elements', '{Control>}d{/Control}', ['element-1', 'element-2']],
    ['a single element', '{meta>}d', ['element-1']],
    ['multiple elements', '{meta>}d', ['element-1', 'element-2']],
  ])(
    'should duplicate %s with the %s keys',
    async (_testname, key, elementIds) => {
      const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
      activeSlide.setActiveElementIds(elementIds);

      render(<DuplicateShortcut />, { wrapper: Wrapper });

      // check that all elements are on the board before the duplication action
      elementIds.forEach((elementId) => {
        expect(activeSlide.getElement(elementId)).toBeDefined();
      });

      await userEvent.keyboard(key);

      // check that the elements have been duplicated
      expect(activeSlide.getElementIds()).toHaveLength(3 + elementIds.length);
    },
  );
});
