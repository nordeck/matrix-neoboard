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

import { noop } from 'lodash';
import { useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { useIsomorphicLayoutEffect } from 'react-use';
import { UseMeasureRect, UseMeasureResult } from 'react-use/lib/useMeasure';

const defaultState: UseMeasureRect = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
};

/**
 * Copy of https://github.com/streamich/react-use/blob/master/src/useMeasure.ts
 * but with flushSync to fix glitches after React 18 update.
 */
function useBrowserMeasure<E extends Element = Element>(): UseMeasureResult<E> {
  const [element, ref] = useState<E | null>(null);
  const [rect, setRect] = useState<UseMeasureRect>(defaultState);

  const observer = useMemo(
    () =>
      new ResizeObserver((entries) => {
        // Wrap in flushSync to first update all components and then measure them.
        // If not doing this there will be visual glitches.
        flushSync(() => {
          if (entries[0]) {
            const { x, y, width, height, top, left, bottom, right } =
              entries[0].contentRect;
            setRect({ x, y, width, height, top, left, bottom, right });
          }
        });
      }),
    [],
  );

  useIsomorphicLayoutEffect(() => {
    if (!element) return;
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [element]);

  return [ref, rect];
}

export const useMeasure =
  window?.ResizeObserver === undefined
    ? <E extends Element = Element>(): UseMeasureResult<E> => [
        noop,
        defaultState,
      ]
    : useBrowserMeasure;
