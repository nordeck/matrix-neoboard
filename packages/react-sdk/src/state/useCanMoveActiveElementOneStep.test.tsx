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
import { act, renderHook } from '@testing-library/react';
import { ComponentType, PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, Mocked, vi } from 'vitest';
import {
  mockFrameElement,
  mockLineElement,
  mockWhiteboardManager,
} from '../lib/testUtils/documentTestUtils';
import { WhiteboardInstance, WhiteboardManager } from './types';
import { useCanMoveActiveElementOneStep } from './useCanMoveActiveElementOneStep';
import { WhiteboardManagerProvider } from './useWhiteboardManager';
import { SlideProvider } from './useWhiteboardSlideInstance';

vi.mock('@matrix-widget-toolkit/mui', async () => ({
  ...(await vi.importActual<typeof import('@matrix-widget-toolkit/mui')>(
    '@matrix-widget-toolkit/mui',
  )),
  getEnvironment: vi.fn(),
}));

let Wrapper: ComponentType<PropsWithChildren<{}>>;
let whiteboardManager: Mocked<WhiteboardManager>;
let activeWhiteboardInstance: WhiteboardInstance;

describe('useCanMoveActiveElementOneStep', () => {
  beforeEach(() => {
    vi.mocked(getEnvironment).mockImplementation(
      (_, defaultValue) => defaultValue,
    );

    // z-order from bottom to top
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [
        [
          'slide-0',
          [
            ['frame-0', mockFrameElement()],
            ['frame-1', mockFrameElement()],
            ['element-0', mockLineElement()],
            ['element-1', mockLineElement()],
            ['element-2', mockLineElement()],
          ],
        ],
      ],
    }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

    Wrapper = ({ children }) => {
      return (
        <WhiteboardManagerProvider whiteboardManager={whiteboardManager}>
          <SlideProvider slideId="slide-0">{children}</SlideProvider>
        </WhiteboardManagerProvider>
      );
    };
  });

  it('should not allow moving without an active element', () => {
    const { result } = renderHook(() => useCanMoveActiveElementOneStep([]), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({ canMoveUp: false, canMoveDown: false });
  });

  it('should only allow moving the bottom frame up', () => {
    const { result } = renderHook(
      () => useCanMoveActiveElementOneStep(['frame-0']),
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current).toEqual({ canMoveUp: true, canMoveDown: false });
  });

  it('should only allow moving the top frame down', () => {
    const { result } = renderHook(
      () => useCanMoveActiveElementOneStep(['frame-1']),
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current).toEqual({ canMoveUp: false, canMoveDown: true });
  });

  it('should only allow moving the lowest non-frame element up', () => {
    const { result } = renderHook(
      () => useCanMoveActiveElementOneStep(['element-0']),
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current).toEqual({ canMoveUp: true, canMoveDown: false });
  });

  it('should allow moving a middle non-frame element up and down', () => {
    const { result } = renderHook(
      () => useCanMoveActiveElementOneStep(['element-1']),
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current).toEqual({ canMoveUp: true, canMoveDown: true });
  });

  it('should only allow moving the top element down', () => {
    const { result } = renderHook(
      () => useCanMoveActiveElementOneStep(['element-2']),
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current).toEqual({ canMoveUp: false, canMoveDown: true });
  });

  it('should not allow moving the only element of the slide', () => {
    ({ whiteboardManager } = mockWhiteboardManager({
      slides: [['slide-0', [['frame-0', mockFrameElement()]]]],
    }));

    const { result } = renderHook(
      () => useCanMoveActiveElementOneStep(['frame-0']),
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current).toEqual({ canMoveUp: false, canMoveDown: false });
  });

  it('should update if the element order changes', () => {
    const { result } = renderHook(
      () => useCanMoveActiveElementOneStep(['element-2']),
      {
        wrapper: Wrapper,
      },
    );

    expect(result.current.canMoveUp).toBe(false);

    act(() => {
      activeWhiteboardInstance
        .getSlide('slide-0')
        .addElement(mockLineElement());
    });

    expect(result.current.canMoveUp).toBe(true);
  });
});
