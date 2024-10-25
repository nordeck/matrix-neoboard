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
import { MouseEvent, WheelEvent, useCallback, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import {
  useActiveElement,
  useWhiteboardSlideInstance,
} from '../../../../state';
import { updateScale, updateTranslation } from '../../../../store/canvasSlice';
import { useAppDispatch } from '../../../../store/reduxToolkitHooks';
import { useLayoutState } from '../../../Layout';
import { HOTKEY_SCOPE_WHITEBOARD } from '../../../WhiteboardHotkeysProvider';
import { useSvgCanvasContext } from '../../SvgCanvas';

export function UnSelectElementHandler() {
  const { activeElementId } = useActiveElement();
  const slideInstance = useWhiteboardSlideInstance();
  const { setDragSelectStartCoords } = useLayoutState();
  const { calculateSvgCoords } = useSvgCanvasContext();
  const [previousPanCoordinates, setPreviousPanCoordinates] = useState<Point>();
  const dispatch = useAppDispatch();

  const unselectElement = useCallback(() => {
    if (activeElementId) {
      slideInstance.setActiveElementId(undefined);
    }
  }, [activeElementId, slideInstance]);

  const handleMouseDown = useCallback(
    (event: MouseEvent<SVGRectElement>) => {
      if (event.button === 0) {
        const point = calculateSvgCoords({
          x: event.clientX,
          y: event.clientY,
        });
        setDragSelectStartCoords(point);

        if (activeElementId) {
          slideInstance.setActiveElementId(undefined);
          window.getSelection()?.empty();
        }
      } else if (event.button === 1) {
        event.preventDefault();
        event.stopPropagation();
        setPreviousPanCoordinates({ x: event.clientX, y: event.clientY });
      }
    },
    [
      activeElementId,
      slideInstance,
      calculateSvgCoords,
      setDragSelectStartCoords,
      setPreviousPanCoordinates,
    ],
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent<SVGRectElement>) => {
      if (previousPanCoordinates === undefined) {
        return;
      }

      dispatch(
        updateTranslation({
          x: event.clientX - previousPanCoordinates.x,
          y: event.clientY - previousPanCoordinates.y,
        }),
      );

      setPreviousPanCoordinates({ x: event.clientX, y: event.clientY });
    },
    [dispatch, previousPanCoordinates, setPreviousPanCoordinates],
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent<SVGRectElement>) => {
      if (event.button === 1) {
        event.preventDefault();
        event.stopPropagation();
        setPreviousPanCoordinates(undefined);
      }
    },
    [setPreviousPanCoordinates],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      if (event.deltaY === 0) {
        return;
      }

      dispatch(updateScale(event.deltaY < 0 ? 0.1 : -0.1));
    },
    [dispatch],
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
      height="100%"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
      width="100%"
      data-testid="unselect-element-layer"
    />
  );
}
