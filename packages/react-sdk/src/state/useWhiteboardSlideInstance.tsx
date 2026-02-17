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

import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { EMPTY } from 'rxjs';
import { isInfiniteCanvasMode, useLatestValue } from '../lib';
import { Element, FrameElement } from './crdt';
import { Elements, WhiteboardSlideInstance } from './types';
import { useActiveWhiteboardInstance } from './useActiveWhiteboardInstance';

const SlideContext = createContext<string | undefined>(undefined);

export function SlideProvider({
  slideId,
  children,
}: PropsWithChildren<{ slideId: string }>) {
  return (
    <SlideContext.Provider value={slideId}>{children}</SlideContext.Provider>
  );
}

export function useWhiteboardSlideInstance(): WhiteboardSlideInstance {
  const slideId = useContext(SlideContext);

  if (!slideId) {
    throw new Error(
      'useWhiteboardSlideInstance can only be used inside of <SlideProvider>',
    );
  }

  const whiteboardInstance = useActiveWhiteboardInstance();
  return whiteboardInstance.getSlide(slideId);
}

export function useActiveWhiteboardInstanceSlideOrFrameIds(): string[] {
  const whiteboardInstance = useActiveWhiteboardInstance();
  const slideInstance = useWhiteboardSlideInstance();

  return useLatestValue(
    () =>
      isInfiniteCanvasMode()
        ? slideInstance.getFrameElementIds()
        : whiteboardInstance.getSlideIds(),
    isInfiniteCanvasMode()
      ? slideInstance.observeFrameElementIds()
      : whiteboardInstance.observeSlideIds(),
  );
}

export function useSlideElementIds(): string[] {
  const slideInstance = useWhiteboardSlideInstance();

  return useLatestValue(
    () => slideInstance.getElementIds(),
    slideInstance.observeElementIds(),
  );
}

export function useElement(elementId: string | undefined): Element | undefined {
  const slideInstance = useWhiteboardSlideInstance();

  const observable = useMemo(
    () => (elementId ? slideInstance.observeElement(elementId) : EMPTY),
    [elementId, slideInstance],
  );

  return useLatestValue(
    () => (elementId ? slideInstance.getElement(elementId) : undefined),
    observable,
  );
}

export function useFrameElement(
  frameElementId: string | undefined,
): FrameElement | undefined {
  const element = useElement(frameElementId);

  if (element && element.type !== 'frame') {
    throw new Error('Element must be of type frame');
  }

  return element;
}

export function useElements(elementIds: string[]): Elements {
  const slideInstance = useWhiteboardSlideInstance();

  const observable = useMemo(
    () => slideInstance.observeElements(elementIds),
    [elementIds, slideInstance],
  );

  return useLatestValue(
    () => slideInstance.getElements(elementIds),
    observable,
  );
}

type ActiveElement = {
  activeElementId: string | undefined;
};

type ActiveElements = {
  activeElementIds: string[];
};

/**
 * Return the active element
 * @deprecated to be replaced with useActiveElements
 * */
export function useActiveElement(): ActiveElement {
  const slideInstance = useWhiteboardSlideInstance();

  const observable = useMemo(
    () => slideInstance.observeActiveElementId(),
    [slideInstance],
  );

  const activeElementId = useLatestValue(
    () => slideInstance.getActiveElementId(),
    observable,
  );

  return { activeElementId };
}

/**
 * Return the active elements
 * */
export function useActiveElements(): ActiveElements {
  const slideInstance = useWhiteboardSlideInstance();

  const observable = useMemo(
    () => slideInstance.observeActiveElementIds(),
    [slideInstance],
  );

  const activeElementIds = useLatestValue(
    () => slideInstance.getActiveElementIds(),
    observable,
  );

  return { activeElementIds };
}

export function useSlideIsLocked(slideId?: string): boolean {
  const slideIdContext = useContext(SlideContext);

  if (!slideIdContext && !slideId) {
    throw new Error(
      'useSlideIsLocked without slideId can only be used inside of <SlideProvider>',
    );
  }

  const whiteboardInstance = useActiveWhiteboardInstance();
  const slideInstance = whiteboardInstance.getSlide(
    slideId ?? slideIdContext ?? '',
  );

  const observable = useMemo(
    () => slideInstance.observeIsLocked(),
    [slideInstance],
  );

  return useLatestValue(() => slideInstance.isLocked(), observable);
}
