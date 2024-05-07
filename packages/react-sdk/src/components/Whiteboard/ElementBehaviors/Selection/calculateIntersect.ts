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

import { Element, calculateBoundingRectForElements } from '../../../../state';
import { Elements } from '../../../../state/types';

/**
 * Calculates which elements overlap a selection using their bounding rectangles.
 *
 * @param selection - selection element
 * @param elements - elements to test for intersection
 * @returns IDs of the intersecting elements
 */
export function calculateIntersect(
  selection: Element,
  elements: Elements,
): string[] {
  const selectedElementIds: string[] = [];
  const selectionBoundingRect = calculateBoundingRectForElements([selection]);
  const selectionBottomRight = {
    x: selectionBoundingRect.offsetX + selectionBoundingRect.width,
    y: selectionBoundingRect.offsetY + selectionBoundingRect.height,
  };

  for (const [elementId, element] of Object.entries(elements)) {
    const elementBoundingRect = calculateBoundingRectForElements([element]);
    const elementBottomRight = {
      x: elementBoundingRect.offsetX + elementBoundingRect.width,
      y: elementBoundingRect.offsetY + elementBoundingRect.height,
    };

    if (
      selectionBoundingRect.offsetX > elementBottomRight.x ||
      elementBoundingRect.offsetX > selectionBottomRight.x
    ) {
      // one element is on the right side of the other
      continue;
    }

    if (
      selectionBottomRight.y < elementBoundingRect.offsetY ||
      elementBottomRight.y < selectionBoundingRect.offsetY
    ) {
      // one element is above the other
      continue;
    }

    selectedElementIds.push(elementId);
  }

  return selectedElementIds;
}
