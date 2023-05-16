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

import React, { PropsWithChildren, useContext, useMemo } from 'react';
import { EMPTY } from 'rxjs';
import { useLatestValue } from '../lib';
import { Element } from './crdt';
import { WhiteboardSlideInstance } from './types';
import { useActiveWhiteboardInstance } from './useActiveWhiteboardInstance';

const SlideContext = React.createContext<string | undefined>(undefined);

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
      'useWhiteboardSlideInstance can only be used inside of <SlideProvider>'
    );
  }

  const whiteboardInstance = useActiveWhiteboardInstance();
  return whiteboardInstance.getSlide(slideId);
}

export function useSlideElementIds(): string[] {
  const slideInstance = useWhiteboardSlideInstance();

  return useLatestValue(
    () => slideInstance.getElementIds(),
    slideInstance.observeElementIds()
  );
}

export function useElement(elementId: string | undefined): Element | undefined {
  const slideInstance = useWhiteboardSlideInstance();

  const observable = useMemo(
    () => (elementId ? slideInstance.observeElement(elementId) : EMPTY),
    [elementId, slideInstance]
  );

  return useLatestValue(
    () => (elementId ? slideInstance.getElement(elementId) : undefined),
    observable
  );
}

type ActiveElement = {
  activeElementId: string | undefined;
};

export function useActiveElement(): ActiveElement {
  const slideInstance = useWhiteboardSlideInstance();

  const observable = useMemo(
    () => slideInstance.observeActiveElementId(),
    [slideInstance]
  );

  const activeElementId = useLatestValue(
    () => slideInstance.getActiveElementId(),
    observable
  );

  return { activeElementId };
}

export function useSlideIsLocked(slideId?: string): boolean {
  const slideIdContext = useContext(SlideContext);

  if (!slideIdContext && !slideId) {
    throw new Error(
      'useSlideIsLocked without slideId can only be used inside of <SlideProvider>'
    );
  }

  const whiteboardInstance = useActiveWhiteboardInstance();
  const slideInstance = whiteboardInstance.getSlide(
    slideId ?? slideIdContext ?? ''
  );

  const observable = useMemo(
    () => slideInstance.observeIsLocked(),
    [slideInstance]
  );

  return useLatestValue(() => slideInstance.isLocked(), observable);
}
