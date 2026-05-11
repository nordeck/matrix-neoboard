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

import { PropsWithChildren, useCallback } from 'react';
import {
  DragDropContext,
  DragStart,
  DragUpdate,
  DropResult,
  ResponderProvided,
  useMouseSensor,
  useTouchSensor,
} from 'react-beautiful-dnd';
import { useTranslation } from 'react-i18next';
import { isInfiniteCanvasMode } from '../../../lib';
import { useActiveWhiteboardInstance } from '../../../state';
import { useCustomKeyboardSensor } from './useCustomKeyboardSensor';
import { useFixLiveRegionAfterModals } from './useFixLiveRegionAfterModals';

export function SlidesDragDropContext({ children }: PropsWithChildren<{}>) {
  const { t } = useTranslation('neoboard');
  const whiteboardInstance = useActiveWhiteboardInstance();

  useFixLiveRegionAfterModals();

  const handleDragStart = useCallback(
    (initial: DragStart, { announce }: ResponderProvided) => {
      announce(
        !isInfiniteCanvasMode()
          ? t(
              'slideOverviewBar.dragAndDrop.dragStart',
              'You have lifted a slide. It is in position {{startPosition}} of {{totalCount}} in the list. Use the arrow keys to move, the M key to drop, and escape to cancel.',
              {
                startPosition: initial.source.index + 1,
                totalCount: whiteboardInstance.getSlideIds().length,
              },
            )
          : t(
              'slideOverviewBar.dragAndDrop.dragStart',
              'You have lifted a frame. It is in position {{startPosition}} of {{totalCount}} in the list. Use the arrow keys to move, the M key to drop, and escape to cancel.',
              {
                context: 'frame',
                startPosition: initial.source.index + 1,
                totalCount: whiteboardInstance
                  .getActiveSlide()
                  ?.getFrameElementIds().length,
              },
            ),
      );
    },
    [t, whiteboardInstance],
  );

  const handleDragUpdate = useCallback(
    (update: DragUpdate, { announce }: ResponderProvided) => {
      if (!update.destination) {
        announce(
          t(
            'slideOverviewBar.dragAndDrop.notOverDropTarget',
            'You are currently not dragging over any droppable area.',
          ),
        );
      } else {
        announce(
          !isInfiniteCanvasMode()
            ? t(
                'slideOverviewBar.dragAndDrop.movedPosition',
                `You have moved the slide to position {{position}} of {{totalCount}}.`,
                {
                  position: update.destination.index + 1,
                  totalCount: whiteboardInstance.getSlideIds().length,
                },
              )
            : t(
                'slideOverviewBar.dragAndDrop.movedPosition',
                `You have moved the frame to position {{position}} of {{totalCount}}.`,
                {
                  context: 'frame',
                  position: update.destination.index + 1,
                  totalCount: whiteboardInstance
                    .getActiveSlide()
                    ?.getFrameElementIds().length,
                },
              ),
        );
      }
    },
    [t, whiteboardInstance],
  );

  const handleDragEnd = useCallback(
    (result: DropResult, { announce }: ResponderProvided) => {
      if (result.type !== 'slide') {
        throw new Error('Unknown draggable type');
      }

      if (result.reason === 'CANCEL') {
        announce(
          !isInfiniteCanvasMode()
            ? t(
                'slideOverviewBar.dragAndDrop.movementCanceled',
                'Movement cancelled. The slide has returned to its starting position of {{startPosition}}.',
                {
                  startPosition: result.source.index + 1,
                },
              )
            : t(
                'slideOverviewBar.dragAndDrop.movementCanceled',
                'Movement cancelled. The frame has returned to its starting position of {{startPosition}}.',
                {
                  context: 'frame',
                  startPosition: result.source.index + 1,
                },
              ),
        );
        return;
      }

      if (!result.destination) {
        announce(
          !isInfiniteCanvasMode()
            ? t(
                'slideOverviewBar.dragAndDrop.droppedOnNoDropTarget',
                'The slide has been dropped while not over a location. The slide has returned to its starting position of {{startPosition}}.',
                { startPosition: result.source.index + 1 },
              )
            : t(
                'slideOverviewBar.dragAndDrop.droppedOnNoDropTarget',
                'The frame has been dropped while not over a location. The frame has returned to its starting position of {{startPosition}}.',
                { context: 'frame', startPosition: result.source.index + 1 },
              ),
        );
        return;
      }

      announce(
        !isInfiniteCanvasMode()
          ? t(
              'slideOverviewBar.dragAndDrop.dropped',
              'You have dropped the slide. It has moved from position {{startPosition}} to {{destinationPosition}}.',
              {
                startPosition: result.source.index + 1,
                destinationPosition: result.destination.index + 1,
              },
            )
          : t(
              'slideOverviewBar.dragAndDrop.dropped',
              'You have dropped the frame. It has moved from position {{startPosition}} to {{destinationPosition}}.',
              {
                context: 'frame',
                startPosition: result.source.index + 1,
                destinationPosition: result.destination.index + 1,
              },
            ),
      );

      if (result.destination.index === result.source.index) {
        return;
      }

      const sourceIndex = result.source.index;
      const targetIndex = result.destination.index;
      if (isInfiniteCanvasMode()) {
        const whiteboardSlideInstance = whiteboardInstance.getActiveSlide();
        if (whiteboardSlideInstance) {
          const frameElementId =
            whiteboardSlideInstance.getFrameElementIds()[sourceIndex];
          whiteboardSlideInstance.moveFrame(frameElementId, targetIndex);
        }
      } else {
        const sourceSlideId = whiteboardInstance.getSlideIds()[sourceIndex];
        whiteboardInstance.moveSlide(sourceSlideId, targetIndex);
      }
    },
    [t, whiteboardInstance],
  );

  return (
    <DragDropContext
      enableDefaultSensors={false}
      sensors={[useTouchSensor, useMouseSensor, useCustomKeyboardSensor]}
      onDragStart={handleDragStart}
      onDragUpdate={handleDragUpdate}
      onDragEnd={handleDragEnd}
    >
      {children}
    </DragDropContext>
  );
}
