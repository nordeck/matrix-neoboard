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
  Element,
  PathElement,
  useActiveElements,
  useElements,
} from '../../../state';
import { defaultStrokeWidth } from '../../common/constants';

function isPolyline(element: Element): element is PathElement {
  return element.type === 'path' && element.kind === 'polyline';
}

type UseActivePolylineStrokeWidthResult = {
  /**
   * The stroke width of the first selected polyline, undefined if no polylines in the selection.
   */
  strokeWidth: number | undefined;
};

export function useActivePolylineStrokeWidth(): UseActivePolylineStrokeWidthResult {
  const { activeElementIds } = useActiveElements();
  const activeElements = useElements(activeElementIds);

  const firstSelectedPolyline = useMemo(() => {
    const elements = Object.values(activeElements);
    return elements.find(isPolyline);
  }, [activeElements]);

  const strokeWidth = firstSelectedPolyline
    ? (firstSelectedPolyline.strokeWidth ?? defaultStrokeWidth)
    : undefined;

  return { strokeWidth };
}
