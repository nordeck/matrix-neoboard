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

import { clamp } from 'lodash';
import { useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  calculateBoundingRectForElements,
  Element,
  findActiveAndAttachedElementIds,
  findConnectingPaths,
  useWhiteboardSlideInstance,
} from '../../../state';
import {
  calculateMoveElementsOverrideUpdates,
  elementsUpdates,
  findElementAttachFrame,
  findElementFrameChanges,
  getPathElements,
  mergeElementsAndOverrides,
  MoveShiftMultiplier,
  moveStepSize,
  whiteboardHeight,
  whiteboardWidth,
} from '../../Whiteboard';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';

export function MoveShortcuts() {
  const slideInstance = useWhiteboardSlideInstance();

  /**
   * Calculates the distance to move an element for a single key press.
   *
   * @param shiftKey - Whether the shift key is held down, which multiplies the step size.
   * @returns The step size, in whiteboard units.
   */
  const getStepSize = useCallback(
    (shiftKey: boolean) =>
      shiftKey ? moveStepSize * MoveShiftMultiplier : moveStepSize,
    [],
  );

  const moveElements = useCallback(
    (dx: number, dy: number) => {
      const activeElementIds = slideInstance.getActiveElementIds();
      if (activeElementIds.length === 0) return;

      const frameElements = slideInstance.getFrameElements();
      const elementIds = findActiveAndAttachedElementIds(
        activeElementIds,
        frameElements,
      );

      const activeElementsEntries: [string, Element][] = [];
      for (const elementId of elementIds) {
        const element = slideInstance.getElement(elementId);
        if (element) {
          activeElementsEntries.push([elementId, element]);
        }
      }
      const activeElements = Object.fromEntries(activeElementsEntries);

      const { offsetX, offsetY, width, height } =
        calculateBoundingRectForElements(Object.values(activeElements));
      dx = clamp(dx, -offsetX, whiteboardWidth - offsetX - width);
      dy = clamp(dy, -offsetY, whiteboardHeight - offsetY - height);

      const connectingPathElements = getPathElements(
        slideInstance,
        findConnectingPaths(activeElements),
      );

      const allOverrideUpdates = calculateMoveElementsOverrideUpdates(
        activeElements,
        dx,
        dy,
        connectingPathElements,
      );

      const overrides = Object.fromEntries(
        allOverrideUpdates.map(({ elementId, elementOverride }) => [
          elementId,
          elementOverride,
        ]),
      );
      const newElements = mergeElementsAndOverrides(
        { ...activeElements, ...connectingPathElements },
        overrides,
      );

      const elementAttachFrame = findElementAttachFrame(
        newElements,
        frameElements,
      );
      const frameChanges = findElementFrameChanges(elementAttachFrame, {
        ...activeElements,
        ...connectingPathElements,
      });

      slideInstance.updateElements(
        elementsUpdates(
          slideInstance,
          activeElements,
          allOverrideUpdates,
          frameChanges,
        ),
      );
    },
    [slideInstance],
  );

  const handleMoveUp = useCallback(
    (event: KeyboardEvent) => moveElements(0, -getStepSize(event.shiftKey)),
    [moveElements, getStepSize],
  );
  const handleMoveDown = useCallback(
    (event: KeyboardEvent) => moveElements(0, getStepSize(event.shiftKey)),
    [moveElements, getStepSize],
  );
  const handleMoveLeft = useCallback(
    (event: KeyboardEvent) => moveElements(-getStepSize(event.shiftKey), 0),
    [moveElements, getStepSize],
  );
  const handleMoveRight = useCallback(
    (event: KeyboardEvent) => moveElements(getStepSize(event.shiftKey), 0),
    [moveElements, getStepSize],
  );

  const options = {
    preventDefault: true,
    enableOnContentEditable: true,
    scopes: HOTKEY_SCOPE_WHITEBOARD,
    ignoreModifiers: true,
  } as const;

  useHotkeys('arrowup', handleMoveUp, options, [handleMoveUp]);
  useHotkeys('arrowdown', handleMoveDown, options, [handleMoveDown]);
  useHotkeys('arrowleft', handleMoveLeft, options, [handleMoveLeft]);
  useHotkeys('arrowright', handleMoveRight, options, [handleMoveRight]);

  return null;
}
