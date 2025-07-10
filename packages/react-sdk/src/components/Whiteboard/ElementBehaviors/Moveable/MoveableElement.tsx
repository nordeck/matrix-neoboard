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

import { styled } from '@mui/material';
import {
  MouseEvent,
  PropsWithChildren,
  RefObject,
  useCallback,
  useRef,
  useState,
} from 'react';
import { DraggableCore, DraggableData, DraggableEvent } from 'react-draggable';
import { useUnmount } from 'react-use';
import {
  calculateBoundingRectForElements,
  findConnectingPaths,
  PathElement,
  Point,
  useWhiteboardSlideInstance,
} from '../../../../state';
import { BoundingRect } from '../../../../state/crdt/documents/point';
import { Elements } from '../../../../state/types';
import {
  createResetElementOverrides,
  ElementOverrideUpdate,
  useSetElementOverride,
} from '../../../ElementOverridesProvider';
import { useLayoutState } from '../../../Layout';
import { infiniteCanvasMode } from '../../constants';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { useSvgScaleContext } from '../../SvgScaleContext';
import { elementsUpdates, getPathElements } from '../utils';
import { addUserSelectStyles, removeUserSelectStyles } from './DraggableStyles';
import { ResizableProperties } from './types';
import {
  calculateElementOverrideUpdates,
  snapToGridElementOverrideUpdates,
} from './utils';

const DraggableGroup = styled('g')({});

export type MoveableElementProps = PropsWithChildren<{
  elementId?: string;
  overrides?: Elements;
}>;

export function MoveableElement({
  children,
  elementId,
  overrides = {},
}: MoveableElementProps) {
  const { isShowGrid } = useLayoutState();
  const isDragging = useRef<boolean>(false);
  const nodeRef = useRef<SVGRectElement>(null);
  const setElementOverride = useSetElementOverride();
  const { viewportHeight, viewportWidth } = useSvgCanvasContext();
  const slideInstance = useWhiteboardSlideInstance();
  const { calculateSvgCoords } = useSvgCanvasContext();
  const { scale, updateTranslation } = useSvgScaleContext();
  const [cursor, setCursor] = useState<string>('move');

  const [{ deltaX, deltaY }, setDelta] = useState({ deltaX: 0, deltaY: 0 });
  const [resizableProperties, setResizableProperties] =
    useState<ResizableProperties>();
  const [elementOverrideUpdates, setElementOverrideUpdates] = useState<
    ElementOverrideUpdate[]
  >([]);

  useUnmount(() => {
    if (isDragging.current) {
      removeUserSelectStyles();

      if (elementId !== undefined) {
        setElementOverride(createResetElementOverrides([elementId]));
      }
    }
  });
  const handleStart = useCallback(() => {
    isDragging.current = true;
    addUserSelectStyles();
    setDelta({ deltaX: 0, deltaY: 0 });
  }, []);

  const handleDrag = useCallback(
    (event: DraggableEvent, data: DraggableData) => {
      let boundingRect: BoundingRect | undefined;
      let boundingRectCursorOffset: Point | undefined;
      let connectingPathElements: Record<string, PathElement> | undefined;

      if (!resizableProperties) {
        boundingRect = calculateBoundingRectForElements(
          Object.values(overrides),
        );
        const lastCursorPosition: Point = calculateSvgCoords({
          x: data.lastX * scale,
          y: data.lastY * scale,
        });
        boundingRectCursorOffset = {
          x: lastCursorPosition.x - boundingRect.offsetX,
          y: lastCursorPosition.y - boundingRect.offsetY,
        };
        connectingPathElements = getPathElements(
          slideInstance,
          findConnectingPaths(overrides),
        );
        setResizableProperties({
          boundingRect,
          boundingRectCursorOffset,
          connectingPathElements,
        });
        if (isMouseEvent(event) && isButtonToPan(event.buttons)) {
          setCursor('grabbing');
        }
      } else {
        ({ boundingRect, boundingRectCursorOffset, connectingPathElements } =
          resizableProperties);
      }

      setDelta((old) => ({
        deltaX: old.deltaX + data.deltaX,
        deltaY: old.deltaY + data.deltaY,
      }));

      const cursorPosition: Point = calculateSvgCoords({
        x: data.x * scale,
        y: data.y * scale,
      });

      if (isMouseEvent(event) && isButtonToPan(event.buttons)) {
        const { offsetX, offsetY } = calculateBoundingRectForElements(
          Object.values(overrides),
        );

        const deltaX = cursorPosition.x - boundingRectCursorOffset.x - offsetX;
        const deltaY = cursorPosition.y - boundingRectCursorOffset.y - offsetY;

        updateTranslation(deltaX * scale, deltaY * scale);
      } else {
        const elementOverrideUpdates = calculateElementOverrideUpdates(
          overrides,
          cursorPosition.x - boundingRectCursorOffset.x,
          cursorPosition.y - boundingRectCursorOffset.y,
          viewportWidth,
          viewportHeight,
          connectingPathElements,
          boundingRect,
        );

        setElementOverride(elementOverrideUpdates);
        setElementOverrideUpdates(elementOverrideUpdates);
      }
    },
    [
      setElementOverride,
      viewportHeight,
      viewportWidth,
      overrides,
      resizableProperties,
      slideInstance,
      calculateSvgCoords,
      scale,
      updateTranslation,
    ],
  );

  const handleStop = useCallback(() => {
    const connectingPathElements =
      resizableProperties?.connectingPathElements ?? {};
    if (deltaX !== 0 || deltaY !== 0) {
      const newElementOverrideUpdates = isShowGrid
        ? snapToGridElementOverrideUpdates(
            elementOverrideUpdates,
            overrides,
            connectingPathElements,
          )
        : elementOverrideUpdates;

      const updates = elementsUpdates(
        slideInstance,
        overrides,
        newElementOverrideUpdates,
      );

      slideInstance.updateElements(updates);
    }

    setElementOverride(undefined);
    setResizableProperties(undefined);
    isDragging.current = false;
    removeUserSelectStyles();
    setCursor('move');
  }, [
    deltaX,
    deltaY,
    elementOverrideUpdates,
    isShowGrid,
    overrides,
    setElementOverride,
    slideInstance,
    resizableProperties,
  ]);

  return (
    <DraggableCore
      // disable the hack since we already added it via <DraggableStyles>.
      enableUserSelectHack={false}
      nodeRef={nodeRef as unknown as RefObject<HTMLElement>}
      onDrag={handleDrag}
      onStop={handleStop}
      onStart={handleStart}
      scale={scale}
      allowAnyClick={infiniteCanvasMode ? true : undefined}
    >
      <DraggableGroup ref={nodeRef} cursor={cursor}>
        {children}
      </DraggableGroup>
    </DraggableCore>
  );
}

function isMouseEvent(
  event: DraggableEvent,
): event is MouseEvent<HTMLElement | SVGElement> {
  return event.type.startsWith('mouse');
}

function isButtonToPan(buttons: number): boolean {
  return buttons === 2 || buttons === 4;
}
