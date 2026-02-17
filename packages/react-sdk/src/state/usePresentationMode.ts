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

import { first } from 'lodash';
import { useMemo } from 'react';
import { useObservable } from 'react-use';
import { Subject } from 'rxjs';
import { FrameElement, Point } from './crdt';
import { Elements, PresentationState } from './types';
import { useActiveWhiteboardInstance } from './useActiveWhiteboardInstance';

type UsePresentationMode = {
  state: PresentationState;
  toggleEditMode: () => void;
  togglePresentation: (viewBoxCenter?: Point) => void;
};

export function usePresentationMode(): UsePresentationMode {
  const activeWhiteboardInstance = useActiveWhiteboardInstance();

  const observable = useMemo(
    () =>
      activeWhiteboardInstance
        .getPresentationManager()
        ?.observePresentationState() ?? new Subject<PresentationState>(),
    [activeWhiteboardInstance],
  );

  const presentationState = useObservable(observable, { type: 'idle' });

  return useMemo<UsePresentationMode>(
    () => ({
      state: presentationState,
      toggleEditMode: () => {
        activeWhiteboardInstance.getPresentationManager()?.toggleEditMode();
      },
      togglePresentation: (viewBoxCenter?: Point) => {
        if (presentationState.type === 'idle') {
          const activeSlideId = activeWhiteboardInstance.getActiveSlideId();
          let activeFrameElementId: string | undefined = undefined;
          if (activeSlideId && viewBoxCenter) {
            const whiteboardSlideInstance =
              activeWhiteboardInstance.getSlide(activeSlideId);
            activeFrameElementId = findNearestFrame(
              whiteboardSlideInstance.getFrameElements(),
              viewBoxCenter,
            );
          }

          activeWhiteboardInstance
            .getPresentationManager()
            ?.startPresentation(activeFrameElementId);
        } else if (
          presentationState.type === 'presenting' ||
          presentationState.type === 'presentation'
        ) {
          activeWhiteboardInstance.getPresentationManager()?.stopPresentation();
        }
      },
    }),
    [activeWhiteboardInstance, presentationState],
  );
}

function findNearestFrame(
  frameElements: Elements<FrameElement>,
  viewBoxCenter: Point,
): string | undefined {
  const { x: viewBoxCenterX, y: viewBoxCenterY } = viewBoxCenter;
  const frameIdsOrdered = Object.entries(frameElements)
    .map(
      ([
        frameElementId,
        {
          position: { x, y },
          width,
          height,
        },
      ]) => {
        const deltaX = Math.abs(x + width / 2 - viewBoxCenterX);
        const deltaY = Math.abs(y + height / 2 - viewBoxCenterY);
        const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        return [frameElementId, distance] as [string, number];
      },
    )
    .sort(([_id1, distance1], [_id2, distance2]) => distance1 - distance2);
  const firstFrameIdsOrdered = first(frameIdsOrdered);
  return firstFrameIdsOrdered ? firstFrameIdsOrdered[0] : undefined;
}
