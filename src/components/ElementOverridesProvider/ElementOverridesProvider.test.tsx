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
import { act } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { ComponentType, PropsWithChildren } from 'react';
import {
  WhiteboardTestingContextProvider,
  mockEllipseElement,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { WhiteboardManager } from '../../state';
import { LayoutStateProvider } from '../Layout';
import { SlidesProvider } from '../Layout/SlidesProvider';
import { ElementOverridesProvider } from './ElementOverridesProvider';
import { useElementOverride } from './useElementOverride';
import { useElementOverrides } from './useElementOverrides';
import { useSetElementOverride } from './useSetElementOverride';

let widgetApi: MockedWidgetApi;

afterEach(() => widgetApi.stop());

beforeEach(() => (widgetApi = mockWidgetApi()));

describe('useElementCoordsState', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let whiteboardManager: jest.Mocked<WhiteboardManager>;

  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [['element-1', mockEllipseElement({ text: 'Hello World' })]],
        ],
      ],
    }));

    Wrapper = ({ children }) => {
      return (
        <LayoutStateProvider>
          <WhiteboardTestingContextProvider
            whiteboardManager={whiteboardManager}
            widgetApi={widgetApi}
          >
            <SlidesProvider>
              <ElementOverridesProvider>{children}</ElementOverridesProvider>
            </SlidesProvider>
          </WhiteboardTestingContextProvider>
        </LayoutStateProvider>
      );
    };
  });

  it('should return the original element', () => {
    const { result } = renderHook(() => useElementOverride('element-1'), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      type: 'shape',
      kind: 'ellipse',
      fillColor: '#ffffff',
      text: 'Hello World',
      position: { x: 0, y: 1 },
      height: 100,
      width: 50,
    });
  });

  it('should return the original elements', () => {
    const elementIds = ['element-1'];
    const { result } = renderHook(() => useElementOverrides(elementIds), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      'element-1': {
        type: 'shape',
        kind: 'ellipse',
        fillColor: '#ffffff',
        text: 'Hello World',
        position: { x: 0, y: 1 },
        height: 100,
        width: 50,
      },
    });
  });

  it('should replace the element position', () => {
    const { result } = renderHook(
      () => {
        const element = useElementOverride('element-1');
        const setElementOverride = useSetElementOverride();
        return { element, setElementOverride };
      },
      { wrapper: Wrapper },
    );

    act(() => {
      result.current.setElementOverride('element-1', {
        position: { x: 50, y: 51 },
      });
    });

    expect(result.current.element).toEqual({
      type: 'shape',
      kind: 'ellipse',
      fillColor: '#ffffff',
      text: 'Hello World',
      position: { x: 50, y: 51 },
      height: 100,
      width: 50,
    });
  });

  it('should replace the elements position', () => {
    const elementIds = ['element-1'];
    const { result } = renderHook(
      () => {
        const element = useElementOverrides(elementIds);
        const setElementOverride = useSetElementOverride();
        return { element, setElementOverride };
      },
      { wrapper: Wrapper },
    );

    act(() => {
      result.current.setElementOverride('element-1', {
        position: { x: 50, y: 51 },
      });
    });

    expect(result.current.element).toEqual({
      'element-1': {
        type: 'shape',
        kind: 'ellipse',
        fillColor: '#ffffff',
        text: 'Hello World',
        position: { x: 50, y: 51 },
        height: 100,
        width: 50,
      },
    });
  });

  it('should replace the element height and width', () => {
    const { result } = renderHook(
      () => {
        const element = useElementOverride('element-1');
        const setElementOverride = useSetElementOverride();
        return { element, setElementOverride };
      },
      { wrapper: Wrapper },
    );

    act(() => {
      result.current.setElementOverride('element-1', {
        height: 125,
        width: 75,
      });
    });

    expect(result.current.element).toEqual({
      type: 'shape',
      kind: 'ellipse',
      fillColor: '#ffffff',
      text: 'Hello World',
      position: { x: 0, y: 1 },
      height: 125,
      width: 75,
    });
  });

  it('should clean the override', () => {
    const { result } = renderHook(
      () => {
        const element = useElementOverride('element-1');
        const setElementOverride = useSetElementOverride();
        return { element, setElementOverride };
      },
      { wrapper: Wrapper },
    );

    act(() => {
      result.current.setElementOverride('element-1', { height: 10 });
    });

    expect(result.current.element).toEqual({
      type: 'shape',
      kind: 'ellipse',
      fillColor: '#ffffff',
      text: 'Hello World',
      position: { x: 0, y: 1 },
      height: 10,
      width: 50,
    });

    act(() => {
      result.current.setElementOverride('element-1', undefined);
    });

    expect(result.current.element).toEqual({
      type: 'shape',
      kind: 'ellipse',
      fillColor: '#ffffff',
      text: 'Hello World',
      position: { x: 0, y: 1 },
      height: 100,
      width: 50,
    });
  });
});
