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
import {
  MouseEvent,
  PointerEvent,
  TouchEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
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
  const { setDragSelectStartCoords } = useLayoutState();
  const { calculateSvgCoords } = useSvgCanvasContext();
  const [previousPanCoordinates, setPreviousPanCoordinates] = useState<Point>();
  const [panEnabled, setPanEnabled] = useState(false);
  const { updateTranslation } = useSvgScaleContext();
  const { state: presentationState } = usePresentationMode();

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
      } else if (event.button === 1 || event.button === 2) {
        // Middle or Right click
        event.preventDefault();
        event.stopPropagation();

        if (
          !infiniteCanvasMode ||
          (infiniteCanvasMode && presentationState.type !== 'idle')
        ) {
          // don't enable panning
          return;
        }

        setPanEnabled(true);
        document.body.style.cursor = 'grabbing';
        setPreviousPanCoordinates({ x: event.clientX, y: event.clientY });
      }
    },
    [
      activeElementId,
      slideInstance,
      calculateSvgCoords,
      setDragSelectStartCoords,
      setPreviousPanCoordinates,
      presentationState,
    ],
  );

  const handleMouseEnter = useCallback((event: MouseEvent<SVGRectElement>) => {
    if (event.buttons !== 2) {
      // Stop pan
      setPanEnabled(false);
      setPreviousPanCoordinates(undefined);
      document.body.style.cursor = 'default';
    }
  }, []);

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

  // Add window-level event listeners when panning starts
  useEffect(() => {
    if (!panEnabled) return;

    const handleMouseMove = (event: globalThis.MouseEvent) => {
      if (previousPanCoordinates === undefined) {
        return;
      }

      updateTranslation(
        event.clientX - previousPanCoordinates.x,
        event.clientY - previousPanCoordinates.y,
      );

      setPreviousPanCoordinates({ x: event.clientX, y: event.clientY });
    };

    const handleMouseUp = (event: globalThis.MouseEvent) => {
      if (event.button === 1 || event.button === 2) {
        // Middle and Right click
        event.preventDefault();
        event.stopPropagation();

        if (!infiniteCanvasMode) {
          return;
        }

        setPanEnabled(false);
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [panEnabled, previousPanCoordinates, updateTranslation]);

  const fingerRef = useRef<{ id: number; pos: Point; dt: Date } | undefined>(
    undefined,
  );
  const fingerCountRef = useRef<number>(0);

  const handlePointerDown = (event: PointerEvent<SVGRectElement>) => {
    if (event.pointerType !== 'touch') return;

    // const fprev = fingerCountRef.current;

    const position = {
      x: event.clientX,
      y: event.clientY,
    };

    // const { dt } = fingerRef.current || {};

    // const curdt = new Date();

    // if (dt && (curdt.getTime() - dt.getTime()) > 500  ) {
    //   fingerCountRef.current = 1;
    // } else {
    //   fingerCountRef.current++;
    // }

    // const deltadt = dt && curdt.getTime() - dt.getTime();

    // console.log(`vs svgcanvas pointerDown`, {
    //   event,
    //   fprev,
    //   f: fingerCountRef.current,
    //   deltadt,
    // });

    fingerRef.current = {
      id: event.pointerId,
      pos: position,
      dt: new Date(),
    };

    if (fingerCountRef.current !== 3) return;

    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerUp = (event: PointerEvent<SVGRectElement>) => {
    if (event.pointerType !== 'touch') return;

    //fingerCountRef.current--;
    //if (fingerCountRef.current < 0) fingerCountRef.current = 0;
    //if (event.pointerId === fingerRef.current?.id) return;//fingerRef.current = undefined;

    // console.log(`vs svgcanvas pointerUp`, { event, f: fingerCountRef.current });

    if (fingerCountRef.current !== 3) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const handlePointerMove = (event: PointerEvent<SVGRectElement>) => {
    // console.log(`vs svgcanvas pointerMove`, {
    //   event,
    //   f: fingerCountRef.current,
    // });
    if (event.pointerType !== 'touch') return;

    const finger = fingerRef.current;

    if (!finger) return;
    // console.log(`vs svgcanvas pointerMove 2`, {
    //   event,
    //   f: fingerCountRef.current,
    // });
    if (fingerCountRef.current !== 3) return;
    // console.log(`vs svgcanvas pointerMove 3`, {
    //   event,
    //   f: fingerCountRef.current,
    // });
    if (event.pointerId !== finger.id) return;
    // console.log(`vs svgcanvas pointerMove 4`, {
    //   event,
    //   f: fingerCountRef.current,
    // });

    finger.dt = new Date();

    const position = {
      x: event.clientX,
      y: event.clientY,
    };

    const deltaX = finger.pos.x - position.x;
    const deltaY = finger.pos.y - position.y;

    updateTranslation(-deltaX, -deltaY);
    // console.log(`vs svgcanvas updateTranslation`, {deltaX, deltaY})

    event.preventDefault();
    event.stopPropagation();
    finger.pos = position;
  };

  const handleTouchMove = (e: TouchEvent<SVGRectElement>) => {
    fingerCountRef.current = e.changedTouches.length;
  };

  return (
    <rect
      fill="transparent"
      height={whiteboardHeight}
      onMouseDown={handleMouseDown}
      onMouseEnter={handleMouseEnter}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerMove={handlePointerMove}
      onTouchMove={handleTouchMove}
      width={whiteboardWidth}
      data-testid="unselect-element-layer"
    />
  );
}
