/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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
import { useSvgScaleContext } from '../components/Whiteboard';
import { zoomStep } from '../components/Whiteboard/constants';
import { usePresentationMode } from '../state';

/**
 * Hook that provides zoom control functionality
 * @returns Object containing zoom control functions and current scale
 */
export const useZoomControls = () => {
  const { scale, updateScale, viewportCanvasCenter } = useSvgScaleContext();
  const { state: presentationState } = usePresentationMode();
  const isPresentationMode = presentationState.type !== 'idle';

  const resetZoom = useCallback(() => {
    if (isPresentationMode) {
      return;
    }
    updateScale(1, 'set', viewportCanvasCenter);
  }, [updateScale, viewportCanvasCenter, isPresentationMode]);

  const zoomOut = useCallback(() => {
    if (isPresentationMode) {
      return;
    }

    updateScale(-zoomStep, 'add', viewportCanvasCenter);
  }, [updateScale, viewportCanvasCenter, isPresentationMode]);

  const zoomIn = useCallback(() => {
    if (isPresentationMode) {
      return;
    }

    updateScale(zoomStep, 'add', viewportCanvasCenter);
  }, [updateScale, viewportCanvasCenter, isPresentationMode]);

  return {
    scale,
    resetZoom,
    zoomOut,
    zoomIn,
  };
};
