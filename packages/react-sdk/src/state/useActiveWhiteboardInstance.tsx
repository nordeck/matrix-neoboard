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

import { useMemo } from 'react';
import { useObservable } from 'react-use';
import { isInfiniteCanvasMode, useLatestValue } from '../lib';
import { WhiteboardInstance, WhiteboardStatistics } from './types';
import { useDistinctObserveBehaviorSubject } from './useDistinctObserveBehaviorSubject';
import { useWhiteboardManager } from './useWhiteboardManager';
import { useActiveWhiteboardInstanceSlideOrFrameIds } from './useWhiteboardSlideInstance';

/**
 * @throws an Error, if there is no active whiteboard
 */
export function useActiveWhiteboardInstance(
  shouldThrow?: true,
): WhiteboardInstance;
export function useActiveWhiteboardInstance(
  shouldThrow: false,
): WhiteboardInstance | undefined;
export function useActiveWhiteboardInstance(
  shouldThrow = true,
): WhiteboardInstance | undefined {
  const whiteboardManager = useWhiteboardManager();
  const subject = useMemo(() => {
    return whiteboardManager.getActiveWhiteboardSubject();
  }, [whiteboardManager]);

  const activeWhiteboardInstance = useDistinctObserveBehaviorSubject(subject);

  if (shouldThrow && !activeWhiteboardInstance) {
    throw new Error('No active whiteboard instance');
  }

  return activeWhiteboardInstance;
}

export function useActiveWhiteboardInstanceSlideIds(): string[] {
  const whiteboardInstance = useActiveWhiteboardInstance();

  return useLatestValue(
    () => whiteboardInstance.getSlideIds(),
    whiteboardInstance.observeSlideIds(),
  );
}

export function useActiveWhiteboardInstanceStatistics(): WhiteboardStatistics {
  const whiteboardInstance = useActiveWhiteboardInstance();

  return useLatestValue(
    () => whiteboardInstance.getWhiteboardStatistics(),
    whiteboardInstance.observeWhiteboardStatistics(),
  );
}

type ActiveSlide = {
  activeSlideId: string | undefined;
};

export function useActiveSlide(): ActiveSlide {
  const whiteboardInstance = useActiveWhiteboardInstance();
  const observable = useMemo(
    () => whiteboardInstance.observeActiveSlideId(),
    [whiteboardInstance],
  );
  const activeSlideId = useLatestValue(
    () => whiteboardInstance.getActiveSlideId(),
    observable,
  );

  return {
    activeSlideId,
  };
}

type ActiveSlideOrFrame = {
  activeId: string | undefined;
  isLastActive: boolean;
  isFirstActive: boolean;
};

export function useActiveSlideOrFrame(): ActiveSlideOrFrame {
  const slideOrFrameIds = useActiveWhiteboardInstanceSlideOrFrameIds();

  const whiteboardInstance = useActiveWhiteboardInstance();
  const observable = useMemo(
    () =>
      isInfiniteCanvasMode()
        ? whiteboardInstance.observeActiveFrameElementId()
        : whiteboardInstance.observeActiveSlideId(),
    [whiteboardInstance],
  );
  const activeId = useLatestValue(
    () =>
      isInfiniteCanvasMode()
        ? whiteboardInstance.getActiveFrameElementId()
        : whiteboardInstance.getActiveSlideId(),
    observable,
  );

  return {
    activeId,
    isFirstActive: activeId !== undefined && slideOrFrameIds[0] === activeId,
    isLastActive:
      activeId !== undefined &&
      slideOrFrameIds[slideOrFrameIds.length - 1] === activeId,
  };
}

export function useIsWhiteboardLoading(): { loading: boolean } {
  const whiteboardInstance = useActiveWhiteboardInstance();
  const loading = useLatestValue(
    () => whiteboardInstance.isLoading(),
    whiteboardInstance.observeIsLoading(),
  );

  return { loading };
}

export function useUndoRedoState(): { canUndo: boolean; canRedo: boolean } {
  const whiteboardInstance = useActiveWhiteboardInstance();
  const observable = useMemo(
    () => whiteboardInstance.observeUndoRedoState(),
    [whiteboardInstance],
  );

  return useObservable(observable, { canUndo: false, canRedo: false });
}
