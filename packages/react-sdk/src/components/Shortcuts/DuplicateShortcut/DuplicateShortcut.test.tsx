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
  mockFrameElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../../../lib/testUtils';
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
            [
              'element-1',
              mockLineElement({ connectedElementStart: 'element-2' }),
            ],
            [
              'element-2',
              mockEllipseElement({ connectedPaths: ['element-1'] }),
            ],
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
      expect(activeSlide.getElementIds()).toHaveLength(4 + elementIds.length);
    },
  );

  it.each(['{Control>}d{/Control}', '{meta>}d'])(
    'should duplicate connected elements with the %s key',
    async (key) => {
      const activeSlide = activeWhiteboardInstance.getSlide('slide-0');
      activeSlide.setActiveElementIds(['element-1', 'element-2']);

      render(<DuplicateShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard(key);

      const elementIds = activeSlide.getElementIds();
      expect(elementIds).toHaveLength(6);

      const [newLineElementId, newShapeElementId] = elementIds.slice(4);

      const newLineElement = activeSlide.getElement(newLineElementId);
      const newShapeElement = activeSlide.getElement(newShapeElementId);

      expect(newLineElement).toEqual(
        expect.objectContaining({
          type: 'path',
          connectedElementStart: newShapeElementId,
        }),
      );
      expect(newShapeElement).toEqual(
        expect.objectContaining({
          type: 'shape',
          connectedPaths: [newLineElementId],
        }),
      );
    },
  );

  it.each(['{Control>}d{/Control}', '{meta>}d'])(
    'should duplicate frame when it has element attached with the %s key keeping elements in the document order',
    async (key) => {
      const activeSlide = activeWhiteboardInstance.getSlide('slide-0');

      activeSlide.updateElements([
        {
          elementId: 'frame-0',
          patch: {
            attachedElements: ['element-1'],
          },
        },
        {
          elementId: 'element-1',
          patch: {
            attachedFrame: 'frame-0',
          },
        },
      ]);

      activeSlide.setActiveElementIds(['frame-0']);

      render(<DuplicateShortcut />, { wrapper: Wrapper });

      await userEvent.keyboard(key);

      const elementIds = activeSlide.getElementIds();
      expect(elementIds).toHaveLength(6);

      const [newLineElementId, newFrameElementId] = elementIds.slice(4);

      const newLineElement = activeSlide.getElement(newLineElementId);
      const newFrameElement = activeSlide.getElement(newFrameElementId);

      expect(newLineElement).toEqual(
        expect.objectContaining({
          type: 'path',
          attachedFrame: newFrameElementId,
        }),
      );
      expect(newFrameElement).toEqual(
        expect.objectContaining({
          type: 'frame',
          attachedElements: [newLineElementId],
        }),
      );
    },
  );
});
