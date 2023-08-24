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

import { isEqual } from 'lodash';
import { useEffect, useRef, useState } from 'react';
import { Observable } from 'rxjs';

/**
 * Returns the latest return value of {@code valueProvider} and memoizes the
 * result on each rerender.
 *
 * If provided, an {@code observable} can trigger a rerendering to also update
 * the value.
 *
 * @param valueProvider - A callback that returns the latest value.
 * @param observable - an optional observable to trigger a rerendering
 * @returns the latest memoized value.
 */
export function useLatestValue<T>(
  valueProvider: () => T,
  observable?: Observable<unknown>,
): T {
  // memoize the latest value of the valueProvider
  const newValue = valueProvider();
  const latestValueRef = useRef<T>(newValue);
  if (!isEqual(newValue, latestValueRef.current)) {
    latestValueRef.current = newValue;
  }

  // rerender this hook whenever the observable emits a new value
  const [, setRenderTimer] = useState(0);
  useEffect(() => {
    if (observable) {
      const subscription = observable.subscribe(() => {
        const newValue = valueProvider();
        if (!isEqual(newValue, latestValueRef.current)) {
          setRenderTimer((old) => old + 1);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
    }

    return () => {};
  }, [observable, valueProvider]);

  return latestValueRef.current;
}
