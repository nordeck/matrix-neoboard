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
import { Subject, of } from 'rxjs';
import { Mocked, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  mockPeerConnectionStatistics,
  mockWhiteboardManager,
} from '../lib/testUtils/documentTestUtils';
import {
  WhiteboardInstance,
  WhiteboardManager,
  WhiteboardStatistics,
} from './types';
import {
  useActiveSlide,
  useActiveWhiteboardInstance,
  useActiveWhiteboardInstanceSlideIds,
  useActiveWhiteboardInstanceStatistics,
  useIsWhiteboardLoading,
  useUndoRedoState,
} from './useActiveWhiteboardInstance';
import { WhiteboardManagerProvider } from './useWhiteboardManager';

let Wrapper: ComponentType<PropsWithChildren<{}>>;
let whiteboardManager: Mocked<WhiteboardManager>;
let activeWhiteboardInstance: WhiteboardInstance;

beforeEach(() => {
  ({ whiteboardManager } = mockWhiteboardManager());
  activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;

  Wrapper = ({ children }) => {
    return (
      <WhiteboardManagerProvider whiteboardManager={whiteboardManager}>
        {children}
      </WhiteboardManagerProvider>
    );
  };
});

describe('useActiveWhiteboardInstance', () => {
  it('should return active whiteboard instance', () => {
    const { result } = renderHook(() => useActiveWhiteboardInstance(), {
      wrapper: Wrapper,
    });

    expect(result.current).toBe(activeWhiteboardInstance);
  });

  it('hook should throw if no active whiteboard instance is available', () => {
    whiteboardManager.clear();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      renderHook(() => useActiveWhiteboardInstance(), {
        wrapper: Wrapper,
      }),
    ).toThrow(Error('No active whiteboard instance'));

    consoleSpy.mockRestore();
  });

  it('hook(false) should return undefined, if no active whiteboard instance is available', () => {
    whiteboardManager.clear();

    const { result } = renderHook(() => useActiveWhiteboardInstance(false), {
      wrapper: Wrapper,
    });

    expect(result.current).toBeUndefined();
  });
});

describe('useActiveWhiteboardInstanceSlideIds', () => {
  it('should return the slide ids of the active whiteboard instance', () => {
    const { result } = renderHook(() => useActiveWhiteboardInstanceSlideIds(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual(['slide-0']);
  });

  it('should update if the slide ids change', () => {
    const { result } = renderHook(() => useActiveWhiteboardInstanceSlideIds(), {
      wrapper: Wrapper,
    });

    let slideId: string | undefined = undefined;
    act(() => {
      slideId = activeWhiteboardInstance.addSlide();
    });

    expect(result.current).toEqual(['slide-0', slideId]);
  });

  it('hook should throw if no active whiteboard instance is available', () => {
    whiteboardManager.clear();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      renderHook(() => useActiveWhiteboardInstance(), {
        wrapper: Wrapper,
      }),
    ).toThrow(Error('No active whiteboard instance'));

    consoleSpy.mockRestore();
  });
});

describe('useActiveWhiteboardInstanceStatistics', () => {
  it('should return the statistics of the active whiteboard instance', () => {
    const { result } = renderHook(
      () => useActiveWhiteboardInstanceStatistics(),
      { wrapper: Wrapper },
    );

    expect(result.current).toEqual({
      communicationChannel: {
        localSessionId: 'own',
        peerConnections: {
          'peer-0': mockPeerConnectionStatistics('@user-alice', 'connected'),
        },
      },
    });
  });

  it('should update if the statistics change', () => {
    const statisticsSubject = new Subject<WhiteboardStatistics>();

    const getWhiteboardStatisticsSpy = vi.spyOn(
      activeWhiteboardInstance,
      'getWhiteboardStatistics',
    );
    vi.spyOn(
      activeWhiteboardInstance,
      'observeWhiteboardStatistics',
    ).mockReturnValue(statisticsSubject);

    const { result } = renderHook(
      () => useActiveWhiteboardInstanceStatistics(),
      { wrapper: Wrapper },
    );

    expect(result.current).toEqual({
      communicationChannel: {
        localSessionId: 'own',
        peerConnections: {
          'peer-0': mockPeerConnectionStatistics('@user-alice', 'connected'),
        },
      },
    });

    act(() => {
      const whiteboardStatistics = {
        communicationChannel: { localSessionId: 'own', peerConnections: {} },
        document: {
          contentSizeInBytes: 0,
          documentSizeInBytes: 0,
          snapshotOutstanding: false,
          snapshotsReceived: 0,
          snapshotsSend: 0,
        },
      };
      getWhiteboardStatisticsSpy.mockReturnValue(whiteboardStatistics);
      statisticsSubject.next(whiteboardStatistics);
    });

    expect(result.current).toEqual({
      communicationChannel: { localSessionId: 'own', peerConnections: {} },
      document: {
        contentSizeInBytes: 0,
        documentSizeInBytes: 0,
        snapshotOutstanding: false,
        snapshotsReceived: 0,
        snapshotsSend: 0,
      },
    });
  });

  it('hook should throw if no active whiteboard instance is available', () => {
    whiteboardManager.clear();
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() =>
      renderHook(() => useActiveWhiteboardInstance(), {
        wrapper: Wrapper,
      }),
    ).toThrow(Error('No active whiteboard instance'));

    consoleSpy.mockRestore();
  });
});

describe('useActiveSlide', () => {
  beforeEach(() => {
    ({ whiteboardManager } = mockWhiteboardManager({ slideCount: 3 }));
    activeWhiteboardInstance = whiteboardManager.getActiveWhiteboardInstance()!;
  });

  it('should return first slide', () => {
    const { result } = renderHook(() => useActiveSlide(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      activeSlideId: 'slide-0',
      isFirstSlideActive: true,
      isLastSlideActive: false,
    });
  });

  it('should return middle slide', () => {
    activeWhiteboardInstance.setActiveSlideId('slide-1');

    const { result } = renderHook(() => useActiveSlide(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      activeSlideId: 'slide-1',
      isFirstSlideActive: false,
      isLastSlideActive: false,
    });
  });

  it('should return last slide', () => {
    activeWhiteboardInstance.setActiveSlideId('slide-2');

    const { result } = renderHook(() => useActiveSlide(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      activeSlideId: 'slide-2',
      isFirstSlideActive: false,
      isLastSlideActive: true,
    });
  });

  it('should handle missing slide', () => {
    ({ whiteboardManager } = mockWhiteboardManager({ slideCount: 0 }));

    const { result } = renderHook(() => useActiveSlide(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      activeSlideId: undefined,
      isFirstSlideActive: false,
      isLastSlideActive: false,
    });
  });

  it('should observe slides', () => {
    const { result } = renderHook(() => useActiveSlide(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      activeSlideId: 'slide-0',
      isFirstSlideActive: true,
      isLastSlideActive: false,
    });

    act(() => {
      activeWhiteboardInstance.setActiveSlideId('slide-2');
    });

    expect(result.current).toEqual({
      activeSlideId: 'slide-2',
      isFirstSlideActive: false,
      isLastSlideActive: true,
    });

    act(() => {
      activeWhiteboardInstance.addSlide();
    });

    expect(result.current).toEqual({
      activeSlideId: 'slide-2',
      isFirstSlideActive: false,
      isLastSlideActive: false,
    });
  });
});

describe('useIsWhiteboardLoading', () => {
  it('should return the loading state of the active whiteboard instance', () => {
    vi.spyOn(activeWhiteboardInstance, 'isLoading').mockReturnValue(true);
    vi.spyOn(activeWhiteboardInstance, 'observeIsLoading').mockReturnValue(
      of(true),
    );

    const { result } = renderHook(() => useIsWhiteboardLoading(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      loading: true,
    });
  });

  it('should update if the loading state changes', () => {
    const loadingSubject = new Subject<boolean>();

    vi.spyOn(activeWhiteboardInstance, 'isLoading').mockReturnValue(true);
    vi.spyOn(activeWhiteboardInstance, 'observeIsLoading').mockReturnValue(
      loadingSubject,
    );

    const { result } = renderHook(() => useIsWhiteboardLoading(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      loading: true,
    });

    act(() => {
      vi.spyOn(activeWhiteboardInstance, 'isLoading').mockReturnValue(false);
      loadingSubject.next(false);
    });

    expect(result.current).toEqual({ loading: false });
  });
});

describe('useUndoRedoState', () => {
  it('should return the undo redo state of the active whiteboard instance', () => {
    vi.spyOn(activeWhiteboardInstance, 'observeUndoRedoState').mockReturnValue(
      of({ canUndo: true, canRedo: false }),
    );

    const { result } = renderHook(() => useUndoRedoState(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({ canUndo: true, canRedo: false });
  });

  it('should update if the loading state changes', () => {
    const UndoRedoStateSubject = new Subject<{
      canUndo: true;
      canRedo: false;
    }>();

    vi.spyOn(activeWhiteboardInstance, 'observeUndoRedoState').mockReturnValue(
      UndoRedoStateSubject,
    );

    const { result } = renderHook(() => useUndoRedoState(), {
      wrapper: Wrapper,
    });

    expect(result.current).toEqual({
      canUndo: false,
      canRedo: false,
    });

    act(() => {
      UndoRedoStateSubject.next({ canUndo: true, canRedo: false });
    });

    expect(result.current).toEqual({ canUndo: true, canRedo: false });
  });
});
