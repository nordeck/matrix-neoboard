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

import React, { useCallback } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { isInfiniteCanvasMode } from '../../../lib';
import {
  useActiveSlideOrFrame,
  useActiveWhiteboardInstance,
  useActiveWhiteboardInstanceSlideOrFrameIds,
  usePresentationMode,
} from '../../../state';

export const PresentationShortcuts: React.FC = function () {
  const { state } = usePresentationMode();
  const { activeId } = useActiveSlideOrFrame();
  const whiteboardInstance = useActiveWhiteboardInstance();
  const slideOrFrameIds = useActiveWhiteboardInstanceSlideOrFrameIds();

  const handleHotkey = useCallback(
    (event: KeyboardEvent) => {
      if (activeId === undefined) {
        return;
      }

      let newActive: string | undefined;
      if (['ArrowRight', ' '].includes(event.key)) {
        const activeIndex = slideOrFrameIds.indexOf(activeId);

        if (activeIndex === slideOrFrameIds.length - 1) {
          // There is now next slide
          return;
        }

        newActive = slideOrFrameIds[activeIndex + 1];
      } else if (event.key === 'ArrowLeft') {
        const activeIndex = slideOrFrameIds.indexOf(activeId);

        if (activeIndex === 0) {
          // There is no previous slide
          return;
        }

        newActive = slideOrFrameIds[activeIndex - 1];
      }

      if (!newActive) {
        return;
      }

      if (isInfiniteCanvasMode()) {
        whiteboardInstance.setActiveFrameElementId(newActive);
      } else {
        whiteboardInstance.setActiveSlideId(newActive);
      }
    },
    [activeId, whiteboardInstance, slideOrFrameIds],
  );

  useHotkeys(['ArrowLeft', 'ArrowRight', 'space'], handleHotkey, {
    enabled: state.type === 'presenting',
    useKey: true,
  });

  return null;
};
