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

import React, {
  PropsWithChildren,
  TouchEvent,
  useCallback,
  useRef,
} from 'react';
import {
  Point,
  useActiveElements,
  usePresentationMode,
  useWhiteboardSlideInstance,
} from '../../../state';
import { useLayoutState } from '../../Layout';
import { useSvgScaleContext } from '../../Whiteboard';
import { useSvgCanvasContext } from '../../Whiteboard/SvgCanvas';

const TAP_TIMEOUT_MS = 300;
const DRAG_SELECT_LAYER_SHOW_DURATION_MS = 300;

const FrameTouchWrapper: React.FC<PropsWithChildren<{ elementId: string }>> = ({
  children,
  elementId,
}) => {
  const slideInstance = useWhiteboardSlideInstance();
  const { updateTranslation } = useSvgScaleContext();
  const { setDragSelectStartCoords, isDragSelecting, isTouchScaling } =
    useLayoutState();
  const { calculateSvgCoords } = useSvgCanvasContext();
  const { state: presentationState } = usePresentationMode();
  const { activeElementSet } = useActiveElements();

  const panEnabled = presentationState.type === 'idle';

  // wrap into ref to pass into the setTimeout
  const isDragSelectingRef = useRef(isDragSelecting);
  isDragSelectingRef.current = isDragSelecting;

  const fingerRef = useRef<{ pos: Point; dt: Date }>({
    pos: { x: 0, y: 0 },
    dt: new Date(),
  });

  const handleTouchMove = useCallback(
    (e: TouchEvent<SVGRectElement>) => {
      if (e.touches.length > 1) return;

      const position = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };

      const frameSelected = activeElementSet.has(elementId);

      if (frameSelected) {
        return;
      }

      if (isTouchScaling) {
        return;
      }

      // if we got here, then we want to drag the canvas

      e.preventDefault();
      e.stopPropagation();

      const finger = fingerRef.current;
      const deltaX = finger.pos.x - position.x;
      const deltaY = finger.pos.y - position.y;

      if (panEnabled) {
        updateTranslation(-deltaX, -deltaY);
      }

      finger.pos = position;
    },
    [
      activeElementSet,
      elementId,
      isTouchScaling,
      panEnabled,
      updateTranslation,
    ],
  );

  const flashdragselect = useCallback(() => {
    // show drag select briefly
    if (!fingerRef.current.pos) return;

    setDragSelectStartCoords(
      calculateSvgCoords({
        x: fingerRef.current.pos.x,
        y: fingerRef.current.pos.y,
      }),
    );

    // shedule a drag select layer removal
    setTimeout(() => {
      if (!isDragSelectingRef.current) setDragSelectStartCoords();
    }, DRAG_SELECT_LAYER_SHOW_DURATION_MS);
  }, [calculateSvgCoords, setDragSelectStartCoords]);

  const handleTouchStart = useCallback(
    (e: TouchEvent<SVGRectElement>) => {
      if (e.touches.length > 1) return;

      const position = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };

      fingerRef.current.pos = position;
      fingerRef.current.dt = new Date();

      const frameSelected = activeElementSet.has(elementId);

      if (frameSelected) {
        return;
      }

      e.stopPropagation();
      e.preventDefault();
    },
    [activeElementSet, elementId],
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent<SVGRectElement>) => {
      const tap = Date.now() - fingerRef.current.dt.getTime() < TAP_TIMEOUT_MS;

      const frameSelected = activeElementSet.has(elementId);
      const nothingSelected = activeElementSet.size === 0;

      // if frame is selected and tapped, keep it selected and flash a drag select overlay
      if (frameSelected) {
        if (tap) {
          slideInstance.setActiveElementId(elementId);
          flashdragselect();
        }
        return;
      }

      // if nothing is selected and frame is tapped,
      // select the frame and flash a drag select overlay
      if (nothingSelected) {
        if (tap && !isTouchScaling) {
          slideInstance.setActiveElementId(elementId);
          flashdragselect();
        }

        // so that it won't select the frame if user stopped panning the canvas
        e.stopPropagation();
        return;
      }

      e.stopPropagation();
      e.preventDefault();

      // if something else was selected and user tapped on the frame,
      // deselect everything
      if (tap) {
        slideInstance.setActiveElementId(void 0);
        flashdragselect();
      }
    },
    [
      activeElementSet,
      elementId,
      flashdragselect,
      isTouchScaling,
      slideInstance,
    ],
  );

  return (
    <g
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {children}
    </g>
  );
};

export default FrameTouchWrapper;
