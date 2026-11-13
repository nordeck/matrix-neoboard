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

import { PointerEvent, PropsWithChildren, useCallback, useRef } from 'react';
import {
  isPositionClose,
  Point,
  PointerType,
  useWhiteboardSlideInstance,
  WhiteboardSlideInstance,
} from '../../../../state';
import { useLayoutState } from '../../../Layout';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { WithSelectionProps } from './types';

export type SelectableElementProps = PropsWithChildren<WithSelectionProps>;

export function SelectableElement({
  children,
  elementId,
  isFrameElement,
}: SelectableElementProps) {
  const positionRef = useRef<{
    isPrimary: boolean;
    time: number;
    position: Point;
  }>();
  const positionForDragSelectRef = useRef<Point>();

  const slideInstance = useWhiteboardSlideInstance();
  const { activeTool, setDragSelectStartCoords } = useLayoutState();
  const { calculateSvgCoords } = useSvgCanvasContext();
  const isInSelectionMode = activeTool === 'select';

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (!isInSelectionMode) return;

      event.stopPropagation();

      positionForDragSelectRef.current = undefined;

      if (event.pointerType === 'touch') {
        if (isFrameElement) {
          const activeElementIds = slideInstance.getActiveElementIds();
          if (
            activeElementIds.length > 0 &&
            !activeElementIds.includes(elementId)
          ) {
            slideInstance.setActiveElementId(undefined);
          } else {
            positionRef.current = {
              isPrimary: event.isPrimary,
              time: Date.now(),
              position: {
                x: event.clientX,
                y: event.clientY,
              },
            };
          }
        } else {
          positionRef.current = {
            isPrimary: event.isPrimary,
            time: Date.now(),
            position: {
              x: event.clientX,
              y: event.clientY,
            },
          };
        }
        return;
      }

      if (event.button === 0 && !isFrameElement) {
        selectElement(
          slideInstance,
          event.shiftKey,
          elementId,
          event.pointerType,
        );
      } else if (event.button === 0 && isFrameElement) {
        const activeElementIds = slideInstance.getActiveElementIds();
        const touchedFrameIsSelected = activeElementIds.includes(elementId);

        if (activeElementIds.length > 0 && !touchedFrameIsSelected) {
          slideInstance.setActiveElementId(undefined);
          window.getSelection()?.empty();
        } else {
          positionRef.current = {
            isPrimary: event.isPrimary,
            time: Date.now(),
            position: {
              x: event.clientX,
              y: event.clientY,
            },
          };
        }

        // An unselected frame can initiate drag select (like the empty canvas area).
        if (!touchedFrameIsSelected) {
          positionForDragSelectRef.current = {
            x: event.clientX,
            y: event.clientY,
          };
        }
      } else {
        positionRef.current = {
          isPrimary: event.isPrimary,
          time: Date.now(),
          position: {
            x: event.clientX,
            y: event.clientY,
          },
        };
      }
    },
    [elementId, isFrameElement, isInSelectionMode, slideInstance],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      const startPosition = positionForDragSelectRef.current;

      if (!startPosition) return;

      // Only the mouse or pen tip starts a drag select.
      if (
        event.pointerType === 'touch' ||
        event.buttons !== 1 ||
        !event.isPrimary
      ) {
        positionForDragSelectRef.current = undefined;
        return;
      }

      // Ignore small movements
      if (
        isPositionClose(startPosition, {
          x: event.clientX,
          y: event.clientY,
        })
      ) {
        return;
      }

      positionForDragSelectRef.current = undefined;
      positionRef.current = undefined;

      setDragSelectStartCoords(calculateSvgCoords(startPosition));

      if (
        event.pointerType === 'pen' &&
        event.target instanceof Element &&
        event.target.hasPointerCapture(event.pointerId)
      ) {
        // release the event capture, or the drag select layer won't get pointer move events
        event.target.releasePointerCapture(event.pointerId);
      }
    },
    [calculateSvgCoords, setDragSelectStartCoords],
  );

  const handlePointerUp = useCallback(
    (event: PointerEvent) => {
      positionForDragSelectRef.current = undefined;

      if (!isInSelectionMode) return;

      event.stopPropagation();

      if (event.pointerType === 'touch') {
        if (
          positionRef.current &&
          positionRef.current.isPrimary &&
          isInSelectionMode &&
          Date.now() - positionRef.current.time < 300 &&
          isPositionClose(positionRef.current.position, {
            x: event.clientX,
            y: event.clientY,
          })
        ) {
          selectElement(slideInstance, false, elementId, event.pointerType);
        }
        positionRef.current = undefined;
        return;
      }

      if (
        (event.button !== 0 || (event.button === 0 && isFrameElement)) &&
        positionRef.current &&
        isPositionClose(positionRef.current.position, {
          x: event.clientX,
          y: event.clientY,
        })
      ) {
        selectElement(
          slideInstance,
          event.shiftKey,
          elementId,
          event.pointerType,
        );
      }
      positionRef.current = undefined;
    },
    [elementId, isFrameElement, isInSelectionMode, slideInstance],
  );

  return (
    <g
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {children}
    </g>
  );
}

export function selectElement(
  slideInstance: WhiteboardSlideInstance,
  shiftKey: boolean,
  elementId: string,
  eventType: PointerType,
) {
  if (!shiftKey) {
    if (!slideInstance.getActiveElementIds().includes(elementId)) {
      slideInstance.setActiveElementId(elementId);
    }
  } else if (slideInstance.getActiveElementIds().includes(elementId)) {
    slideInstance.unselectActiveElementId(elementId);
  } else {
    slideInstance.addActiveElementId(elementId);
  }
  slideInstance.setActiveElementSelectionPointerType(eventType);
}
