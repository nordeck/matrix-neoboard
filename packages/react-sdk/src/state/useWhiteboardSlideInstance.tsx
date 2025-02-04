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

import React, {
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { EMPTY } from 'rxjs';
import { Element } from './crdt';
import { Elements, WhiteboardSlideInstance } from './types';
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
      'useWhiteboardSlideInstance can only be used inside of <SlideProvider>',
    );
  }

  const whiteboardInstance = useActiveWhiteboardInstance();
  return whiteboardInstance.getSlide(slideId);
}

export function useSlideElementIds(): string[] {
  const slideInstance = useWhiteboardSlideInstance();

  return slideInstance.getElementIds();
}

export function useElement(elementId: string | undefined): Element | undefined {
  const slideInstance = useWhiteboardSlideInstance();

  const observable = useMemo(
    () => (elementId ? slideInstance.observeElement(elementId) : EMPTY),
    [elementId, slideInstance],
  );

  const [element, setElement] = useState<Element | undefined>(
    elementId ? slideInstance.getElement(elementId) : undefined,
  );
  useEffect(() => {
    const subscription = observable.subscribe(() => {
      setElement(elementId ? slideInstance.getElement(elementId) : undefined);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [observable, elementId, slideInstance]);
  return element;
}

export function useElements(elementIds: string[]): Elements {
  const slideInstance = useWhiteboardSlideInstance();

  const observable = useMemo(
    () => slideInstance.observeElements(elementIds),
    [elementIds, slideInstance],
  );

  const [elements, setElements] = useState<Elements>(
    slideInstance.getElements(elementIds),
  );
  useEffect(() => {
    const subscription = observable.subscribe(() => {
      setElements(slideInstance.getElements(elementIds));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [observable, elementIds, slideInstance]);
  return elements;
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

  const [activeElementId, setActiveElementId] = useState<string | undefined>(
    slideInstance.getActiveElementId(),
  );
  useEffect(() => {
    const subscription = observable.subscribe(() => {
      setActiveElementId(slideInstance.getActiveElementId());
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [observable, slideInstance]);
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

  const [activeElementIds, setActiveElementIds] = useState<string[]>(
    slideInstance.getActiveElementIds(),
  );
  useEffect(() => {
    const subscription = observable.subscribe(() => {
      setActiveElementIds(slideInstance.getActiveElementIds());
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [observable, slideInstance]);
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

  const [isLocked, setIsLocked] = useState<boolean>(slideInstance.isLocked());
  useEffect(() => {
    const subscription = observable.subscribe(() => {
      setIsLocked(slideInstance.isLocked());
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [observable, slideInstance]);
  return isLocked;
}
