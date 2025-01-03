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

import { act, renderHook } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import {
  mockEllipseElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../lib/testUtils/documentTestUtils';
import { WhiteboardInstance, WhiteboardManager } from './types';
import { WhiteboardManagerProvider } from './useWhiteboardManager';
import {
  SlideProvider,
  useActiveElement,
  useActiveElements,
  useElement,
  useElements,
  useSlideElementIds,
  useSlideIsLocked,
  useWhiteboardSlideInstance,
} from './useWhiteboardSlideInstance';

let Wrapper: ComponentType<PropsWithChildren<{}>>;
let whiteboardManager: Mocked<WhiteboardManager>;
let activeWhiteboardInstance: WhiteboardInstance;

beforeEach(() => {
  ({ whiteboardManager } = mockWhiteboardManager());
  activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

  Wrapper = ({ children }) => {
    return (
      <WhiteboardManagerProvider whiteboardManager={whiteboardManager}>
        <SlideProvider slideId="slide-0">{children}</SlideProvider>
      </WhiteboardManagerProvider>
    );
  };
});

describe('<SlideProvider/>', () => {
  it('should provide SlideContext', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      renderHook(() => useWhiteboardSlideInstance(), {
        wrapper: Wrapper,
      }),
    ).not.toThrow();

    consoleSpy.mockRestore();
  });

  it('should provide ActiveElementProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      renderHook(() => useActiveElement(), {
        wrapper: Wrapper,
      }),
    ).not.toThrow();

    consoleSpy.mockRestore();
  });
});

describe('useWhiteboardSlideInstance', () => {
  it('should return the selected slide', () => {
    const getSlide = vi.spyOn(activeWhiteboardInstance, 'getSlide');

    const { result } = renderHook(() => useWhiteboardSlideInstance(), {
      wrapper: Wrapper,
    });

    expect(getSlide).toHaveBeenCalledWith('slide-0');
    expect(result.current).toBe(getSlide.mock.results[0].value);
  });

  it('hook should throw without context', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useWhiteboardSlideInstance())).toThrow(
      Error(
        'useWhiteboardSlideInstance can only be used inside of <SlideProvider>',
      ),
    );

    consoleSpy.mockRestore();
  });
});

describe('useSlideElementIds', () => {
  it('should return the elements of the selected slide', () => {
    const { result } = renderHook(() => useSlideElementIds(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual(['element-0']);
  });

  it('should update if the element ids change', () => {
    const { result } = renderHook(() => useSlideElementIds(), {
      wrapper: Wrapper,
    });

    let elementId: string | undefined = undefined;
    act(() => {
      elementId = activeWhiteboardInstance
        .getSlide('slide-0')
        .addElement(mockLineElement());
    });

    expect(result.current).toEqual(['element-0', elementId]);
  });
});

describe('useElement(s)', () => {
  it('should return undefined if element does not exist', () => {
    const { result } = renderHook(() => useElement('element-1'), {
      wrapper: Wrapper,
    });

    expect(result.current).toBeUndefined();
  });

  it('should return undefined if elements does not exist', () => {
    const elementIds = ['element-1', 'element-2'];
    const { result } = renderHook(() => useElements(elementIds), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({});
  });

  it('should handle undefined element id', () => {
    const { result } = renderHook(() => useElement(undefined), {
      wrapper: Wrapper,
    });

    expect(result.current).toBeUndefined();
  });

  it('should return the element', () => {
    const whiteboardSlideInstance =
      activeWhiteboardInstance.getSlide('slide-0');
    const getElement = vi.spyOn(whiteboardSlideInstance, 'getElement');

    const { result } = renderHook(() => useElement('element-0'), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual(mockEllipseElement());
    expect(getElement).toHaveBeenCalledWith('element-0');
  });

  it('should return the elements', () => {
    const whiteboardSlideInstance =
      activeWhiteboardInstance.getSlide('slide-0');
    const getElement = vi.spyOn(whiteboardSlideInstance, 'getElement');

    const elementIds = ['element-0'];
    const { result } = renderHook(() => useElements(elementIds), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({ 'element-0': mockEllipseElement() });
    expect(getElement).toHaveBeenCalledWith('element-0');
  });

  it('should update if the element ids change', () => {
    const { result } = renderHook(() => useElement('element-0'), {
      wrapper: Wrapper,
    });

    act(() => {
      activeWhiteboardInstance
        .getSlide('slide-0')
        .updateElement('element-0', { strokeColor: '#ff0000' });
    });

    expect(result.current).toEqual({
      ...mockEllipseElement(),
      strokeColor: '#ff0000',
    });
  });
});

describe('useActiveElement', () => {
  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockLineElement()],
            ['element-1', mockLineElement()],
          ],
        ],
        ['slide-1', [['element-2', mockLineElement()]]],
        ['slide-3', [['element-3', mockLineElement()]]],
      ],
    }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;
  });

  it('should return undefined element', () => {
    const { result } = renderHook(() => useActiveElement(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({ activeElementId: undefined });
  });

  it('should return selected element', () => {
    activeWhiteboardInstance
      .getSlide('slide-0')
      .setActiveElementId('element-0');

    const { result } = renderHook(() => useActiveElement(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({ activeElementId: 'element-0' });
  });

  it('should observe elements', () => {
    const { result } = renderHook(() => useActiveElement(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({ activeElementId: undefined });

    act(() => {
      activeWhiteboardInstance
        .getSlide('slide-0')
        .setActiveElementId('element-1');
    });

    expect(result.current).toEqual({ activeElementId: 'element-1' });
  });
});

describe('useActiveElements', () => {
  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['element-0', mockLineElement()],
            ['element-1', mockLineElement()],
            ['element-2', mockLineElement()],
          ],
        ],
        ['slide-1', [['element-3', mockLineElement()]]],
        ['slide-3', [['element-4', mockLineElement()]]],
      ],
    }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;
  });

  it('should return no elements selected', () => {
    const { result } = renderHook(() => useActiveElements(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({ activeElementIds: [] });
  });

  it('should return selected elements', () => {
    activeWhiteboardInstance
      .getSlide('slide-0')
      .setActiveElementIds(['element-0', 'element-1']);

    const { result } = renderHook(() => useActiveElements(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      activeElementIds: ['element-0', 'element-1'],
    });
  });

  it('should observe elements', () => {
    const { result } = renderHook(() => useActiveElements(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({ activeElementIds: [] });

    act(() => {
      activeWhiteboardInstance
        .getSlide('slide-0')
        .setActiveElementIds(['element-0', 'element-1']);
    });

    expect(result.current).toEqual({
      activeElementIds: ['element-0', 'element-1'],
    });
  });
});

describe('useSlideIsLocked', () => {
  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({ slideCount: 2 }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;
  });

  it('should return the lock status', () => {
    activeWhiteboardInstance.getSlide('slide-0').lockSlide();

    const { result } = renderHook(() => useSlideIsLocked(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual(true);
  });

  it('should return the lock status of a specific slide', () => {
    activeWhiteboardInstance.getSlide('slide-1').lockSlide();

    const { result } = renderHook(() => useSlideIsLocked('slide-1'), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual(true);
  });

  it('should update if locked state changes', () => {
    const { result } = renderHook(() => useSlideIsLocked(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual(false);

    act(() => {
      activeWhiteboardInstance.getSlide('slide-0').lockSlide();
    });

    expect(result.current).toEqual(true);
  });

  it('hook should throw if slide does not exist', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      renderHook(() => useSlideIsLocked('not-exists'), {
        wrapper: Wrapper,
      }),
    ).toThrow(Error('SlideId does not exist'));

    consoleSpy.mockRestore();
  });

  it('hook should throw without context', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useSlideIsLocked())).toThrow(
      Error(
        'useSlideIsLocked without slideId can only be used inside of <SlideProvider>',
      ),
    );

    consoleSpy.mockRestore();
  });
});
