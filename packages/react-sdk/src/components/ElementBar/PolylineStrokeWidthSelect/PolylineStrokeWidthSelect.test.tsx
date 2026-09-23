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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axe from 'axe-core';
import { act, ComponentType, PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockPolylineElement,
  mockWhiteboardManager,
  WhiteboardTestingContextProvider,
} from '../../../lib/testUtils/documentTestUtils';
import { Point, WhiteboardSlideInstance } from '../../../state';
import { defaultStrokeWidth } from '../../common/consts';
import { Toolbar } from '../../common/Toolbar';
import { ConnectionPointProvider } from '../../ConnectionPointProvider';
import { ElementOverridesProvider } from '../../ElementOverridesProvider';
import { ActiveTool, LayoutStateProvider, useLayoutState } from '../../Layout';
import { WhiteboardHost } from '../../Whiteboard';
import * as constants from '../../Whiteboard/constants';
import { WhiteboardHotkeysProvider } from '../../WhiteboardHotkeysProvider';
import { PolylineStrokeWidthSelect } from './PolylineStrokeWidthSelect';

vi.mock('../../Whiteboard/SvgCanvas/useMeasure', () => ({
  useMeasure: vi.fn().mockReturnValue([vi.fn(), { width: 1920, height: 1080 }]),
}));

vi.mock('../../Whiteboard/SvgCanvas/utils', async () => ({
  ...(await vi.importActual('../../Whiteboard/SvgCanvas/utils')),
  calculateSvgCoords: (position: Point) => position,
}));

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

describe('<PolylineStrokeWidthSelect/>', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let slide: WhiteboardSlideInstance;
  let setActiveTool: (value: ActiveTool) => void;

  beforeEach(() => {
    vi.mocked(getEnvironment).mockImplementation(
      (_, defaultValue) => defaultValue,
    );

    document.elementsFromPoint = vi.fn().mockReturnValue([]);

    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockPolylineElement({ strokeWidth: 8 })],
            ['element-7', mockPolylineElement({ strokeWidth: 7 })],
            [
              'element-undefined',
              mockPolylineElement({ strokeWidth: undefined }),
            ],
          ],
        ],
      ],
    });
    slide = whiteboardManager
      .getActiveWhiteboardInstance()!
      .getSlide('slide-0');
    slide.setActiveElementIds(['element-0']);

    function LayoutStateExtractor() {
      ({ setActiveTool } = useLayoutState());
      return null;
    }

    Wrapper = ({ children }) => (
      <LayoutStateProvider>
        <LayoutStateExtractor />
        <WhiteboardHotkeysProvider>
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            <ElementOverridesProvider>
              <ConnectionPointProvider>
                <Toolbar>{children}</Toolbar>
              </ConnectionPointProvider>
            </ElementOverridesProvider>
          </WhiteboardTestingContextProvider>
        </WhiteboardHotkeysProvider>
      </LayoutStateProvider>
    );

    vi.spyOn(constants, 'infiniteCanvasMode', 'get').mockReturnValue(false);
    vi.spyOn(constants, 'whiteboardWidth', 'get').mockReturnValue(1920);
    vi.spyOn(constants, 'whiteboardHeight', 'get').mockReturnValue(1080);
  });

  it('should render without exploding', async () => {
    render(<PolylineStrokeWidthSelect />, { wrapper: Wrapper });

    const select = screen.getByRole('combobox', {
      name: 'Select Polyline Stroke Width',
    });

    expect(select).toBeInTheDocument();
  });

  it('should have no accessibility violations', async () => {
    const { container } = render(<PolylineStrokeWidthSelect />, {
      wrapper: Wrapper,
    });

    expect(
      screen.getByRole('combobox', { name: 'Select Polyline Stroke Width' }),
    ).toBeInTheDocument();

    expect(await axe.run(container)).toHaveNoViolations();
  });

  it('should show the stroke width of the active element', async () => {
    slide.setActiveElementId('element-7');
    render(<PolylineStrokeWidthSelect />, { wrapper: Wrapper });

    const select = screen.getByRole('combobox', {
      name: 'Select Polyline Stroke Width',
    });

    expect(select).toHaveTextContent('7');
  });

  it('should show the default stroke width if the active element has none', async () => {
    slide.setActiveElementId('element-undefined');
    render(<PolylineStrokeWidthSelect />, { wrapper: Wrapper });

    const select = screen.getByRole('combobox', {
      name: 'Select Polyline Stroke Width',
    });

    expect(select).toHaveTextContent('4');
  });

  it('should show the stroke width of the first selected element if several elements are active', async () => {
    slide.setActiveElementIds(['element-7', 'element-0']);
    render(<PolylineStrokeWidthSelect />, { wrapper: Wrapper });

    const select = screen.getByRole('combobox', {
      name: 'Select Polyline Stroke Width',
    });

    expect(select).toHaveTextContent('7');
  });

  it('should always contain the default stroke width as an option', async () => {
    slide.setActiveElementId('element-7');
    render(<PolylineStrokeWidthSelect />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('combobox', { name: 'Select Polyline Stroke Width' }),
    );

    expect(
      screen.getByRole('option', { name: `${defaultStrokeWidth}` }),
    ).toBeInTheDocument();
  });

  it('should apply a new stroke width for the selected polyline', async () => {
    render(<PolylineStrokeWidthSelect />, { wrapper: Wrapper });

    const select = screen.getByRole('combobox', {
      name: 'Select Polyline Stroke Width',
    });

    expect(select).toHaveTextContent('8');

    await userEvent.click(select);
    await userEvent.click(screen.getByRole('option', { name: '12' }));

    expect(slide.getElement('element-0')).toEqual(
      expect.objectContaining({ strokeWidth: 12 }),
    );
  });

  it('should use the last applied polyline stroke width for a newly drawn polyline', async () => {
    const polylineId = slide.addElement(
      mockPolylineElement({ strokeWidth: 8 }),
    );
    slide.setActiveElementId(polylineId);

    render(<WhiteboardHost />, { wrapper: Wrapper });

    await userEvent.click(
      screen.getByRole('combobox', { name: 'Select Polyline Stroke Width' }),
    );
    await userEvent.click(screen.getByRole('option', { name: '16' }));

    act(() => setActiveTool('polyline'));

    const draftHandler = screen.getByTestId('draft-pointer-handler');

    await userEvent.pointer([
      {
        keys: '[MouseLeft>]',
        target: draftHandler,
        coords: { clientX: 50, clientY: 101 },
      },
      {
        pointerName: 'mouse',
        target: draftHandler,
        coords: { clientX: 50 + 20, clientY: 100 + 20 },
      },
      {
        keys: '[/MouseLeft]',
        target: draftHandler,
      },
    ]);

    expect(slide.getActiveElementIds().length).toBe(1);

    const newElementId = slide.getActiveElementIds()[0];

    expect(slide.getElement(newElementId)).toEqual(
      expect.objectContaining({
        kind: 'polyline',
        strokeWidth: 16,
      }),
    );
  });
});
