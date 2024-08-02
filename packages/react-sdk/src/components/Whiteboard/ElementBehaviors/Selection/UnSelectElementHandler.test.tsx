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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { MockedWidgetApi, mockWidgetApi } from '@matrix-widget-toolkit/testing';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mocked } from 'jest-mock';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockWhiteboardManager,
} from '../../../../lib/testUtils/documentTestUtils';
import { Point, WhiteboardSlideInstance } from '../../../../state';
import { LayoutStateProvider, useLayoutState } from '../../../Layout';
import { SvgCanvas } from '../../SvgCanvas';
import { UnSelectElementHandler } from './UnSelectElementHandler';

jest.mock('@matrix-widget-toolkit/mui', () => {
  const original = jest.requireActual('@matrix-widget-toolkit/mui');
  return {
    ...original,
    getEnvironment: jest.fn(),
  };
});

describe('<UnSelectElementHandler/>', () => {
  let activeSlide: WhiteboardSlideInstance;
  let dragSelectStartCoords: Point | undefined;
  let widgetApi: MockedWidgetApi;
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let textElement: HTMLDivElement;

  beforeEach(() => {
    mocked(getEnvironment).mockReturnValue('true');
    widgetApi = mockWidgetApi();

    const { whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', [['element-0', mockEllipseElement()]]]],
    });
    const activeWhiteboard = whiteboardManager.getActiveWhiteboardInstance()!;
    activeSlide = activeWhiteboard.getSlide('slide-0');

    function LayoutStateExtractor() {
      ({ dragSelectStartCoords } = useLayoutState());
      return null;
    }

    const textNode = document.createTextNode('test');
    textElement = document.createElement('div');
    textElement.appendChild(textNode);
    document.body.appendChild(textElement);

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <LayoutStateExtractor />
        <SvgCanvas viewportWidth={200} viewportHeight={200}>
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            {children}
          </WhiteboardTestingContextProvider>
        </SvgCanvas>
      </LayoutStateProvider>
    );
  });

  afterEach(() => {
    textElement.remove();
    widgetApi.stop();
  });

  it('should clear active elements and selection on click', async () => {
    activeSlide.setActiveElementIds(['element-0']);
    render(<UnSelectElementHandler />, { wrapper: Wrapper });
    selectText();

    await userEvent.click(screen.getByTestId('unselect-element-layer'));

    expect(activeSlide.getActiveElementIds()).toEqual([]);
    expect(window.getSelection()?.containsNode(textElement)).toBe(false);
  });

  it('should set the drag select start coordinates on mouse down', async () => {
    render(<UnSelectElementHandler />, { wrapper: Wrapper });

    fireEvent.mouseDown(screen.getByTestId('unselect-element-layer'));

    expect(dragSelectStartCoords).toEqual({ x: 23, y: 42 });
  });

  const selectText = () => {
    const range = document.createRange();
    range.selectNode(textElement);
    const selection = window.getSelection();
    selection?.addRange(range);
  };
});
