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
import { snapToGrid } from '../../Grid';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { gridCellSize } from '../../constants';
import { computeResizingConnectingPathElementOverDeltaPoints } from '../Resizable';
import { elementsWithUpdates, getPathElements } from '../utils';
import { addUserSelectStyles, removeUserSelectStyles } from './DraggableStyles';
import { ResizableProperties } from './types';
import { calculateElementOverrideUpdates } from './utils';

const DraggableGroup = styled('g')({
  cursor: 'move',
});

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
  const { scale, viewportHeight, viewportWidth } = useSvgCanvasContext();
  const slideInstance = useWhiteboardSlideInstance();

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
    (_: DraggableEvent, data: DraggableData) => {
      let boundingRect: BoundingRect | undefined;
      let connectingPathElements: Record<string, PathElement> | undefined;
      if (!resizableProperties) {
        setResizableProperties({
          boundingRect: calculateBoundingRectForElements(
            Object.values(overrides),
          ),
          connectingPathElements: getPathElements(
            slideInstance,
            findConnectingPaths(overrides),
          ),
        });
      } else {
        ({ boundingRect, connectingPathElements } = resizableProperties);
      }

      setDelta((old) => ({
        deltaX: old.deltaX + data.deltaX,
        deltaY: old.deltaY + data.deltaY,
      }));

      const elementOverrideUpdates = calculateElementOverrideUpdates(
        overrides,
        data.deltaX,
        data.deltaY,
        viewportWidth,
        viewportHeight,
        connectingPathElements,
        boundingRect,
      );

      setElementOverride(elementOverrideUpdates);
      setElementOverrideUpdates(elementOverrideUpdates);
    },
    [
      setElementOverride,
      viewportHeight,
      viewportWidth,
      overrides,
      resizableProperties,
      slideInstance,
    ],
  );

  const handleStop = useCallback(() => {
    setElementOverride(undefined);
    setResizableProperties(undefined);

    if (deltaX !== 0 || deltaY !== 0) {
      const newOverrideElements = elementsWithUpdates(
        slideInstance,
        overrides,
        elementOverrideUpdates,
      );

      slideInstance.updateElements(
        Object.entries(newOverrideElements).map(([elementId, element]) => {
          let x, y: number;
          let points: Point[] | undefined;
          if (!isShowGrid) {
            x = element.position.x;
            y = element.position.y;
          } else if (
            element.type === 'path' &&
            (element.connectedElementStart || element.connectedElementEnd)
          ) {
            const deltaPoints: (Point | undefined)[] = [];
            const connectedElements = [
              element.connectedElementStart,
              element.connectedElementEnd,
            ];
            for (let i = 0; i < connectedElements.length; i++) {
              const connectedElementId = connectedElements[i];

              const connectedElement = connectedElementId
                ? newOverrideElements[connectedElementId]
                : undefined;

              if (connectedElement) {
                deltaPoints.push({
                  x:
                    snapToGrid(connectedElement.position.x, gridCellSize) -
                    connectedElement.position.x,
                  y:
                    snapToGrid(connectedElement.position.y, gridCellSize) -
                    connectedElement.position.y,
                });
              } else {
                deltaPoints.push(undefined);
              }
            }

            const newOverride =
              computeResizingConnectingPathElementOverDeltaPoints(
                {
                  elementId,
                  element,
                },
                newOverrideElements,
                deltaPoints,
              );

            x = newOverride?.elementOverride?.position?.x ?? element.position.x;
            y = newOverride?.elementOverride?.position?.y ?? element.position.y;
            points = newOverride?.elementOverride?.points;
          } else {
            x = snapToGrid(element.position.x, gridCellSize);
            y = snapToGrid(element.position.y, gridCellSize);
          }

          return {
            elementId,
            patch: {
              position: { x, y },
              points:
                element.type === 'path'
                  ? (points ?? element.points)
                  : undefined,
              ...(element.type === 'path' && {
                connectedElementStart: element.connectedElementStart,
                connectedElementEnd: element.connectedElementEnd,
              }),
              ...(element.type === 'shape' && {
                connectedPaths: element.connectedPaths,
              }),
            },
          };
        }),
      );
    }

    isDragging.current = false;
    removeUserSelectStyles();
  }, [
    deltaX,
    deltaY,
    elementOverrideUpdates,
    isShowGrid,
    overrides,
    setElementOverride,
    slideInstance,
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
    >
      <DraggableGroup ref={nodeRef}>{children}</DraggableGroup>
    </DraggableCore>
  );
}
