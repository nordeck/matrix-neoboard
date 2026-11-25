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

import { useTheme } from '@mui/material';
import React, {
  PointerEvent,
  PropsWithChildren,
  TouchEvent,
  useCallback,
  useRef,
} from 'react';
import {
  FrameElement,
  isPositionClose,
  Point,
  useWhiteboardSlideInstance,
} from '../../../state';
import { useLayoutState } from '../../Layout';
import {
  ElementContextMenu,
  MoveableElement,
  SelectableElement,
  WithExtendedSelectionProps,
} from '../../Whiteboard';
import { useSvgCanvasContext } from '../../Whiteboard/SvgCanvas';

type DisplayProps = FrameElement & WithExtendedSelectionProps;

const FrameDisplay: React.FC<DisplayProps> = ({
  elementId,
  activeElementIds = [],
  active,
  readOnly,
  elements = {},
  frameHasElementMoved = false,
  ...frameProps
}) => {
  const theme = useTheme();

  const renderedChild = (
    <g data-testid={`element-frame-${elementId}`}>
      <rect
        x={frameProps.position.x}
        y={frameProps.position.y}
        fill={theme.palette.common.white}
        height={frameProps.height}
        stroke={
          frameHasElementMoved
            ? theme.palette.primary.main
            : theme.palette.grey[500]
        }
        strokeWidth="2"
        width={frameProps.width}
      />
    </g>
  );

  if (readOnly) {
    return renderedChild;
  }

  return (
    <FrameDragSelect elementId={elementId}>
      <SelectableElement
        active={active}
        readOnly={readOnly}
        elementId={elementId}
        isFrameElement={true}
      >
        <MoveableElement elementId={elementId} elements={elements}>
          <ElementContextMenu
            elementId={elementId}
            activeElementIds={activeElementIds}
          >
            {renderedChild}
          </ElementContextMenu>
        </MoveableElement>
      </SelectableElement>
    </FrameDragSelect>
  );
};

export default React.memo(FrameDisplay);

/**
 * Wrapper component that allows starting a drag select above an unselected frame (like on the empty
 * canvas area) with the mouse left button or a pen.
 * Can't have  this in FrameDisplay directly because useLayoutState hook can't be used in SlidePreview (readOnly condition).
 */
function FrameDragSelect({
  elementId,
  children,
}: PropsWithChildren<{ elementId: string }>) {
  const slideInstance = useWhiteboardSlideInstance();
  const { activeTool, setDragSelectStartCoords } = useLayoutState();
  const { calculateSvgCoords } = useSvgCanvasContext();
  const isInSelectionMode = activeTool === 'select';

  const dragSelectStartPositionRef = useRef<Point>();

  // Remember whether the gesture is performed by a pen on an unselected frame,
  // the DraggableCore can't tell a pen and a finger apart.
  const isPenOnUnselectedFrameRef = useRef(false);

  const handlePointerDownCapture = useCallback(
    (event: PointerEvent) => {
      dragSelectStartPositionRef.current = undefined;

      if (!event.isPrimary) return;

      isPenOnUnselectedFrameRef.current = false;

      if (
        !isInSelectionMode ||
        event.pointerType === 'touch' ||
        event.button !== 0
      ) {
        return;
      }

      const activeElementIds = slideInstance.getActiveElementIds();
      if (activeElementIds.includes(elementId)) return;

      isPenOnUnselectedFrameRef.current = event.pointerType === 'pen';

      dragSelectStartPositionRef.current = {
        x: event.clientX,
        y: event.clientY,
      };
    },
    [elementId, isInSelectionMode, slideInstance],
  );

  const handlePointerMoveCapture = useCallback(
    (event: PointerEvent) => {
      const startPosition = dragSelectStartPositionRef.current;

      if (!startPosition) return;

      // Only the mouse or pen tip starts a drag select.
      if (
        event.pointerType === 'touch' ||
        event.buttons !== 1 ||
        !event.isPrimary
      ) {
        dragSelectStartPositionRef.current = undefined;
        return;
      }

      // Ignore small movements
      if (
        isPositionClose(startPosition, { x: event.clientX, y: event.clientY })
      ) {
        return;
      }

      dragSelectStartPositionRef.current = undefined;

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

  const handlePointerUpCapture = useCallback(() => {
    dragSelectStartPositionRef.current = undefined;
  }, []);

  const handleTouchStartCapture = useCallback((event: TouchEvent) => {
    if (isPenOnUnselectedFrameRef.current) {
      // A pen performs a drag select, so don't let the frame start a drag
      // which would pan the canvas at the same time.
      event.stopPropagation();
    }
  }, []);

  // The handlers are registered in the capture phase, so they run before the
  // inner selectable element, which stops the propagation of pointer events to Selectable/Movable
  return (
    <g
      onPointerDownCapture={handlePointerDownCapture}
      onPointerMoveCapture={handlePointerMoveCapture}
      onPointerUpCapture={handlePointerUpCapture}
      onTouchStartCapture={handleTouchStartCapture}
    >
      {children}
    </g>
  );
}
