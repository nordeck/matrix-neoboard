/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { RefObject } from 'react';
import { UseMeasureResult } from 'react-use/lib/useMeasure';
import { useMeasure as useMeasureInternal } from '../../../lib';

export function useMeasure<
  E extends HTMLElement | SVGElement = HTMLElement,
>(): UseMeasureResult<E> {
  const [ref, measuredRect] = useMeasureInternal<E>();
  const refObject = ref as unknown as RefObject<HTMLDivElement>;

  if (
    measuredRect.width === 0 &&
    measuredRect.height === 0 &&
    refObject.current
  ) {
    // The measurement happened before the first resize, we need to initialize
    // it with the the correct size...
    const rect = refObject.current.getBoundingClientRect();

    return [ref, rect];
  }

  return [ref, measuredRect];
}
