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

import { useEffect, useMemo, useState } from 'react';
import { useObservable } from 'react-use';
import { WhiteboardInstance, WhiteboardStatistics } from './types';
import { useDistinctObserveBehaviorSubject } from './useDistinctObserveBehaviorSubject';
import { useWhiteboardManager } from './useWhiteboardManager';

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

  const [slideIds, setSlideIds] = useState<string[]>(
    whiteboardInstance.getSlideIds(),
  );
  useEffect(() => {
    const subscription = whiteboardInstance.observeSlideIds().subscribe(() => {
      setSlideIds(whiteboardInstance.getSlideIds());
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [whiteboardInstance]);
  return slideIds;
}

export function useActiveWhiteboardInstanceStatistics(): WhiteboardStatistics {
  const whiteboardInstance = useActiveWhiteboardInstance();

  const [statistics, setStatistics] = useState<WhiteboardStatistics>(
    whiteboardInstance.getWhiteboardStatistics(),
  );
  useEffect(() => {
    const subscription = whiteboardInstance
      .observeWhiteboardStatistics()
      .subscribe(() => {
        setStatistics(whiteboardInstance.getWhiteboardStatistics());
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [whiteboardInstance]);
  return statistics;
}

type ActiveSlide = {
  activeSlideId: string | undefined;
  isLastSlideActive: boolean;
  isFirstSlideActive: boolean;
};

export function useActiveSlide(): ActiveSlide {
  const slideIds = useActiveWhiteboardInstanceSlideIds();

  const whiteboardInstance = useActiveWhiteboardInstance();

  const [activeSlideId, setActiveSlideId] = useState<string | undefined>(
    whiteboardInstance.getActiveSlideId(),
  );
  useEffect(() => {
    const subscription = whiteboardInstance
      .observeActiveSlideId()
      .subscribe(() => {
        setActiveSlideId(whiteboardInstance.getActiveSlideId());
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [whiteboardInstance]);

  return {
    activeSlideId,
    isFirstSlideActive:
      activeSlideId !== undefined && slideIds[0] === activeSlideId,
    isLastSlideActive:
      activeSlideId !== undefined &&
      slideIds[slideIds.length - 1] === activeSlideId,
  };
}

export function useIsWhiteboardLoading(): { loading: boolean } {
  const whiteboardInstance = useActiveWhiteboardInstance();

  const [loading, setLoading] = useState<boolean>(
    whiteboardInstance.isLoading(),
  );
  useEffect(() => {
    const subscription = whiteboardInstance.observeIsLoading().subscribe(() => {
      setLoading(whiteboardInstance.isLoading());
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [whiteboardInstance]);

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
