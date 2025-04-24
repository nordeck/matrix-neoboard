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
import { zoomStep } from '../components/Whiteboard/constants';
import { useSvgScaleContext } from '../components/Whiteboard/SvgScaleContext';

/**
 * Hook that provides zoom control functionality
 * @returns Object containing zoom control functions and current scale
 */
export const useZoomControls = () => {
  const { scale, setScale, updateScale, viewportCanvasCenter } =
    useSvgScaleContext();

  const resetZoom = useCallback(() => {
    setScale(1, viewportCanvasCenter);
  }, [setScale, viewportCanvasCenter]);

  const zoomOut = useCallback(() => {
    updateScale(-zoomStep, viewportCanvasCenter);
  }, [updateScale, viewportCanvasCenter]);

  const zoomIn = useCallback(() => {
    updateScale(zoomStep, viewportCanvasCenter);
  }, [updateScale, viewportCanvasCenter]);

  return {
    scale,
    resetZoom,
    zoomOut,
    zoomIn,
  };
};
