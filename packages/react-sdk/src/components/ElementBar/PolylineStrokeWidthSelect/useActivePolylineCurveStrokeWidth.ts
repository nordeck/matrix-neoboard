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

import { useMemo } from 'react';
import {
  defaultStrokeWidth,
  isPolyline,
  useActiveElements,
  useElements,
} from '../../../state';
import { isCurve } from '../../../state/crdt/documents/elements';

type UseActivePolylineCurveStrokeWidthResult = {
  /**
   * The stroke width of the first selected polyline, undefined if no polylines in the selection.
   */
  strokeWidth: number | undefined;
};

export function useActivePolylineCurveStrokeWidth(): UseActivePolylineCurveStrokeWidthResult {
  const { activeElementIds } = useActiveElements();
  const activeElements = useElements(activeElementIds);

  const firstSelected = useMemo(() => {
    const elements = Object.values(activeElements);
    return elements.find((e) => isPolyline(e) || isCurve(e));
  }, [activeElements]);

  const strokeWidth = firstSelected
    ? (firstSelected.strokeWidth ?? defaultStrokeWidth)
    : undefined;

  return { strokeWidth };
}
