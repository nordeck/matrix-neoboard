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

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { PropsWithChildren, useCallback } from 'react';
import { useActiveWhiteboardInstance } from '../../../state';
import { useFixLiveRegionAfterModals } from './useFixLiveRegionAfterModals';

export function SlidesDragDropContext({
  children,
  onDraggingOver,
}: PropsWithChildren<{ onDraggingOver?: (event: DragOverEvent) => void }>) {
  const whiteboardInstance = useActiveWhiteboardInstance();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      keyboardCodes: {
        start: ['KeyM'],
        cancel: ['Escape'],
        end: ['Enter'],
      },
    }),
  );
  useFixLiveRegionAfterModals();

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (
        active.id !== over?.id &&
        active.id !== undefined &&
        over?.id !== undefined
      ) {
        const sourceIndex = active.id;
        const targetIndex = over?.id;
        const sourceSlideId = whiteboardInstance
          .getSlideIds()
          .find((slideId) => slideId === sourceIndex);
        const targetSlideIndex = whiteboardInstance
          .getSlideIds()
          .findIndex((slideId) => slideId === targetIndex);

        if (sourceSlideId && targetIndex) {
          whiteboardInstance.moveSlide(sourceSlideId, targetSlideIndex);
        }
      }
    },
    [whiteboardInstance],
  );

  return (
    <DndContext
      sensors={sensors}
      onDragOver={onDraggingOver}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DndContext>
  );
}
