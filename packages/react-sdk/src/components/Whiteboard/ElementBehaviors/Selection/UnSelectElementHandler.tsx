/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { Point } from 'pdfmake/interfaces';
import { PointerEvent, useCallback, useRef } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  useActiveElement,
  usePresentationMode,
  useWhiteboardSlideInstance,
} from '../../../../state';
import { useLayoutState } from '../../../Layout';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../../WhiteboardHotkeysProvider';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { useSvgScaleContext } from '../../SvgScaleContext';
import {
  infiniteCanvasMode,
  whiteboardHeight,
  whiteboardWidth,
} from '../../constants';

export function UnSelectElementHandler() {
  const { activeElementId } = useActiveElement();
  const slideInstance = useWhiteboardSlideInstance();
  const { isTouchScaling, setDragSelectStartCoords } = useLayoutState();
  const { calculateSvgCoords } = useSvgCanvasContext();
  const { updateTranslation } = useSvgScaleContext();
  const { state: presentationState } = usePresentationMode();

  const isPanningEnabled = presentationState.type === 'idle';

  const positionRef = useRef<Point | undefined>();

  const unselectElement = useCallback(() => {
    if (activeElementId) {
      slideInstance.setActiveElementId(undefined);
    }
  }, [activeElementId, slideInstance]);

  const handlePointerDown = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      if (event.button === 0) {
        if (activeElementId) {
          slideInstance.setActiveElementId(undefined);
          window.getSelection()?.empty();
        }

        if (event.pointerType === 'touch') {
          if (!event.isPrimary || !infiniteCanvasMode) return;

          positionRef.current = {
            x: event.clientX,
            y: event.clientY,
          };
        } else {
          const point = calculateSvgCoords({
            x: event.clientX,
            y: event.clientY,
          });

          setDragSelectStartCoords(point);
        }
      } else if (event.button === 1 || event.button === 2) {
        event.preventDefault();
        event.stopPropagation();

        if (!infiniteCanvasMode || !isPanningEnabled) {
          return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        document.body.style.cursor = 'grabbing';
        positionRef.current = { x: event.clientX, y: event.clientY };
      }
    },
    [
      activeElementId,
      slideInstance,
      calculateSvgCoords,
      setDragSelectStartCoords,
      isPanningEnabled,
    ],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      if (!infiniteCanvasMode || !positionRef.current || !isPanningEnabled)
        return;

      if (isTouchScaling) {
        positionRef.current = { x: event.clientX, y: event.clientY };
        return;
      }

      const deltaX = positionRef.current.x - event.clientX;
      const deltaY = positionRef.current.y - event.clientY;

      updateTranslation(-deltaX, -deltaY);

      positionRef.current = { x: event.clientX, y: event.clientY };
    },
    [isPanningEnabled, updateTranslation, isTouchScaling],
  );

  const handleLostPointerCapture = useCallback(
    (event: PointerEvent<SVGRectElement>) => {
      if (!positionRef.current) return;

      positionRef.current = undefined;
      if (event.pointerType !== 'touch') {
        document.body.style.cursor = 'default';
      }
    },
    [],
  );

  useHotkeys(
    'Escape',
    unselectElement,
    {
      preventDefault: true,
      enableOnContentEditable: true,
      scopes: HOTKEY_SCOPE_WHITEBOARD,
    },
    [unselectElement],
  );

  return (
    <rect
      fill="transparent"
      height={whiteboardHeight}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onLostPointerCapture={handleLostPointerCapture}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      width={whiteboardWidth}
      data-testid="unselect-element-layer"
    />
  );
}
