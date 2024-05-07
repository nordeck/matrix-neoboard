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

import { act, renderHook } from '@testing-library/react';
import { ComponentType, PropsWithChildren, useContext } from 'react';
import {
  mockEllipseElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../../lib/testUtils/documentTestUtils';
import { SlideProvider, WhiteboardManagerProvider } from '../../state';
import {
  ElementOverrideSetterContext,
  ElementOverrideUpdate,
  ElementOverridesProvider,
} from './ElementOverridesProvider';
import { useElementOverrides } from './useElementOverrides';

const element0 = mockEllipseElement();

describe('useElementOverrides', () => {
  let Wrapper: ComponentType<PropsWithChildren<{}>>;
  let setElementOverride: (updates: ElementOverrideUpdate[]) => void;

  beforeEach(() => {
    const { whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', element0],
            ['element-1', mockLineElement()],
          ],
        ],
      ],
    });

    function ElementOverrideSetterExtractor() {
      setElementOverride = useContext(ElementOverrideSetterContext);
      return null;
    }

    Wrapper = ({ children }) => (
      <WhiteboardManagerProvider whiteboardManager={whiteboardManager}>
        <SlideProvider slideId="slide-0">
          <ElementOverridesProvider>
            <ElementOverrideSetterExtractor />
            {children}
          </ElementOverridesProvider>
        </SlideProvider>
      </WhiteboardManagerProvider>
    );
  });

  it('should return an empty object if there are no overrides', () => {
    const { result } = renderHook(() => useElementOverrides([]), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({});
  });

  it('should return the original element if there is no override for it', () => {
    const { result } = renderHook(() => useElementOverrides(['element-0']), {
      wrapper: Wrapper,
    });

    act(() => {
      setElementOverride([]);
    });

    expect(result.current).toEqual({
      'element-0': element0,
    });
  });

  it('should return a shape element with overrides', () => {
    const { result } = renderHook(() => useElementOverrides(['element-0']), {
      wrapper: Wrapper,
    });

    act(() => {
      setElementOverride([
        {
          elementId: 'element-0',
          elementOverride: {
            position: { x: 23, y: 42 },
            width: 1337,
            height: 1338,
          },
        },
      ]);
    });

    expect(result.current).toEqual({
      'element-0': {
        fillColor: '#ffffff',
        height: 1338,
        kind: 'ellipse',
        position: {
          x: 23,
          y: 42,
        },
        text: '',
        type: 'shape',
        width: 1337,
      },
    });
  });

  it('should return a path element with overrides', () => {
    const { result } = renderHook(() => useElementOverrides(['element-1']), {
      wrapper: Wrapper,
    });

    act(() => {
      setElementOverride([
        {
          elementId: 'element-1',
          elementOverride: {
            position: { x: 32, y: 24 },
            points: [{ x: 1337, y: 1338 }],
          },
        },
      ]);
    });

    expect(result.current).toEqual({
      'element-1': {
        kind: 'line',
        position: { x: 32, y: 24 },
        points: [{ x: 1337, y: 1338 }],
        strokeColor: '#ffffff',
        type: 'path',
      },
    });
  });

  it('should only return the overrides of requested elements', () => {
    // useElementOverrides is called with 'element-0' only here
    const { result } = renderHook(() => useElementOverrides(['element-0']), {
      wrapper: Wrapper,
    });

    act(() => {
      // passing both overrides here
      setElementOverride([
        {
          elementId: 'element-1',
          elementOverride: {
            position: { x: 32, y: 24 },
            points: [{ x: 1337, y: 1338 }],
          },
        },
        {
          elementId: 'element-0',
          elementOverride: {
            position: { x: 23, y: 42 },
            width: 1337,
            height: 1338,
          },
        },
      ]);
    });

    // expect only the override for 'element-0' here
    expect(result.current).toEqual({
      'element-0': {
        fillColor: '#ffffff',
        height: 1338,
        kind: 'ellipse',
        position: {
          x: 23,
          y: 42,
        },
        text: '',
        type: 'shape',
        width: 1337,
      },
    });
  });
});
