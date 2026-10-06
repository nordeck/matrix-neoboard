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

import { useElement, useSlideElementIds } from './useWhiteboardSlideInstance';

/**
 * Whether the active element can be moved one step forward / backward in the z-order.
 * Frames always stay below all other elements.
 * Moving is only possible if exactly one element is active.
 * @param activeElementIds ids of the active elements
 */
export function useCanMoveActiveElementOneStep(activeElementIds: string[]): {
  canMoveUp: boolean;
  canMoveDown: boolean;
} {
  const elementId =
    activeElementIds.length === 1 ? activeElementIds[0] : undefined;
  const elementIds = useSlideElementIds();
  const index = elementId ? elementIds.indexOf(elementId) : -1;

  const element = useElement(elementId);
  const elementAbove = useElement(
    index >= 0 ? elementIds[index + 1] : undefined,
  );
  const elementBelow = useElement(
    index >= 0 ? elementIds[index - 1] : undefined,
  );

  if (!element || index < 0) {
    return { canMoveUp: false, canMoveDown: false };
  }

  const isFrame = element.type === 'frame';
  const isElementAtTop = index === elementIds.length - 1;
  const isElementAtBottom = index === 0;

  return {
    canMoveUp: !isElementAtTop && (!isFrame || elementAbove?.type === 'frame'),
    canMoveDown:
      !isElementAtBottom && (isFrame || elementBelow?.type !== 'frame'),
  };
}
