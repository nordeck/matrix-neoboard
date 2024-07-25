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
import {
  useActiveSlide,
  useActiveWhiteboardInstance,
  usePresentationMode,
} from '../../../state';

export const PresentationShortcuts: React.FC = function () {
  const { state } = usePresentationMode();
  const { activeSlideId } = useActiveSlide();
  const whiteboardInstance = useActiveWhiteboardInstance();

  const handleHotkey = useCallback(
    (event: KeyboardEvent) => {
      if (activeSlideId === undefined) {
        return;
      }

      if (['ArrowRight', ' '].includes(event.key)) {
        const slideIds = whiteboardInstance.getSlideIds();
        const activeSlideIndex = slideIds.indexOf(activeSlideId);

        if (activeSlideIndex === slideIds.length - 1) {
          // There is now next slide
          return;
        }

        whiteboardInstance.setActiveSlideId(slideIds[activeSlideIndex + 1]);
      } else if (event.key === 'ArrowLeft') {
        const slideIds = whiteboardInstance.getSlideIds();
        const activeSlideIndex = slideIds.indexOf(activeSlideId);

        if (activeSlideIndex === 0) {
          // There is no previous slide
          return;
        }

        whiteboardInstance.setActiveSlideId(slideIds[activeSlideIndex - 1]);
      }
    },
    [activeSlideId, whiteboardInstance],
  );

  useHotkeys(['ArrowLeft', 'ArrowRight', ' '], handleHotkey, {
    enabled: state.type === 'presenting',
  });

  return null;
};
