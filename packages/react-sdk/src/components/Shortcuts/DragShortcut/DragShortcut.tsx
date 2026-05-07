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

import { useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  findConnectingPaths,
  useWhiteboardSlideInstance,
} from '../../../state';
import {
  computeResizingConnectingPathElementOverDeltaPoints,
  elementsUpdates,
  findElementAttachFrame,
  findElementFrameChanges,
  getPathElements,
  gridCellSize,
  mergeElementsAndOverrides,
} from '../../Whiteboard';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../WhiteboardHotkeysProvider';

export function DragShortcut() {
  const slideInstance = useWhiteboardSlideInstance();

  const moveElements = useCallback(
    (dx: number, dy: number) => {
      const activeElementIds = slideInstance.getActiveElementIds();
      if (activeElementIds.length === 0) return;

      const activeElements = Object.fromEntries(
        activeElementIds
          .map((id) => [id, slideInstance.getElement(id)] as const)
          .filter(
            (entry): entry is [string, NonNullable<(typeof entry)[1]>] =>
              entry[1] !== undefined,
          ),
      );

      const delta = { x: dx, y: dy };

      const activeElementOverrides = Object.entries(activeElements).map(
        ([elementId, element]) => ({
          elementId,
          elementOverride: {
            position: {
              x: element.position.x + dx,
              y: element.position.y + dy,
            },
          },
        }),
      );

      const connectingPathIds = findConnectingPaths(activeElements);
      const connectingPaths = getPathElements(slideInstance, connectingPathIds);

      const connectingPathOverrides = Object.entries(connectingPaths).map(
        ([pathId, path]) => {
          const deltaPoints = [
            activeElements[path.connectedElementStart ?? '']
              ? delta
              : undefined,
            activeElements[path.connectedElementEnd ?? ''] ? delta : undefined,
          ];
          return {
            elementId: pathId,
            elementOverride:
              computeResizingConnectingPathElementOverDeltaPoints(
                { position: path.position, points: path.points },
                deltaPoints,
              ),
          };
        },
      );

      const allOverrideUpdates = [
        ...activeElementOverrides,
        ...connectingPathOverrides,
      ];

      const overrides = Object.fromEntries(
        allOverrideUpdates.map(({ elementId, elementOverride }) => [
          elementId,
          elementOverride,
        ]),
      );

      const newElements = mergeElementsAndOverrides(
        { ...activeElements, ...connectingPaths },
        overrides,
      );

      const elementAttachFrame = findElementAttachFrame(
        newElements,
        slideInstance.getFrameElements(),
      );
      const frameChanges = findElementFrameChanges(elementAttachFrame, {
        ...activeElements,
        ...connectingPaths,
      });

      const updates = elementsUpdates(
        slideInstance,
        activeElements,
        allOverrideUpdates,
        frameChanges,
      );

      slideInstance.updateElements(updates);
    },
    [slideInstance],
  );

  const handleMoveUp = useCallback(
    () => moveElements(0, -gridCellSize),
    [moveElements],
  );
  const handleMoveDown = useCallback(
    () => moveElements(0, gridCellSize),
    [moveElements],
  );
  const handleMoveLeft = useCallback(
    () => moveElements(-gridCellSize, 0),
    [moveElements],
  );
  const handleMoveRight = useCallback(
    () => moveElements(gridCellSize, 0),
    [moveElements],
  );

  const options = {
    preventDefault: true,
    enableOnContentEditable: true,
    scopes: HOTKEY_SCOPE_WHITEBOARD,
  } as const;

  useHotkeys('arrowup', handleMoveUp, options, [handleMoveUp]);
  useHotkeys('arrowdown', handleMoveDown, options, [handleMoveDown]);
  useHotkeys('arrowleft', handleMoveLeft, options, [handleMoveLeft]);
  useHotkeys('arrowright', handleMoveRight, options, [handleMoveRight]);

  return null;
}
