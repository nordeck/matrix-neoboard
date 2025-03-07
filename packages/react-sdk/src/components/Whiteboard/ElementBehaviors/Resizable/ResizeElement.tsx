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

import { Dispatch, useCallback, useState } from 'react';
import { useUnmount } from 'react-use';
import {
  calculateBoundingRectForElements,
  findConnectingPaths,
  PathElement,
  useWhiteboardSlideInstance,
} from '../../../../state';
import { ElementUpdate } from '../../../../state/types';
import { useAppDispatch } from '../../../../store';
import { setShapeSize } from '../../../../store/shapeSizesSlide';
import { useConnectionPoint } from '../../../ConnectionPointProvider';
import {
  createResetElementOverrides,
  ElementOverrideUpdate,
  useElementOverrides,
  useSetElementOverride,
} from '../../../ElementOverridesProvider';
import { useLayoutState } from '../../../Layout';
import { getRenderProperties } from '../../../elements/line/getRenderProperties';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { gridCellSize } from '../../constants';
import { elementsUpdates, getPathElements, lineResizeUpdates } from '../utils';
import { DragEvent, ResizeHandle } from './ResizeHandle';
import { HandlePosition, ResizableProperties } from './types';
import { computeResizing } from './utils';

export type ResizeHandleWrapperProps = {
  handlePosition: HandlePosition;
  /** If true the behaviour of locking the aspect ratio is inverted. */
  invertLockAspectRatio?: boolean;
  onDrag: Dispatch<ElementOverrideUpdate[]>;
  onDragStart: Dispatch<DragEvent>;
  onDragStop: Dispatch<DragEvent>;
  resizableProperties?: ResizableProperties;
};

export function ResizeHandleWrapper({
  handlePosition,
  invertLockAspectRatio,
  onDrag,
  onDragStart,
  onDragStop,
  resizableProperties,
}: ResizeHandleWrapperProps) {
  const { isShowGrid } = useLayoutState();
  const { viewportWidth, viewportHeight } = useSvgCanvasContext();
  const { connectElementIds } = useConnectionPoint();
  const hasConnectElementId = connectElementIds.length > 0;

  const handleDrag = useCallback(
    (event: DragEvent) => {
      onDrag(
        computeResizing(
          handlePosition,
          event,
          viewportWidth,
          viewportHeight,
          invertLockAspectRatio,
          isShowGrid && !hasConnectElementId ? gridCellSize : undefined,
          resizableProperties,
        ),
      );
    },
    [
      invertLockAspectRatio,
      handlePosition,
      isShowGrid,
      onDrag,
      resizableProperties,
      viewportHeight,
      viewportWidth,
      hasConnectElementId,
    ],
  );

  return (
    <ResizeHandle
      position={handlePosition}
      onDrag={handleDrag}
      onDragStart={onDragStart}
      onDragStop={onDragStop}
    />
  );
}

export type ResizeElementProps = {
  elementIds: Array<string>;
};

export function ResizeElement({ elementIds }: ResizeElementProps) {
  const elements = useElementOverrides(elementIds);
  const activeElements = Object.values(elements);
  const setElementOverride = useSetElementOverride();
  const slideInstance = useWhiteboardSlideInstance();
  const dispatch = useAppDispatch();

  const [resizableProperties, setResizableProperties] =
    useState<ResizableProperties>();
  const [elementOverrideUpdates, setElementOverrideUpdates] = useState<
    ElementOverrideUpdate[]
  >([]);

  useUnmount(() => {
    if (resizableProperties) {
      setElementOverride(createResetElementOverrides(elementIds));
    }
  });

  const handleDragStart = useCallback(() => {
    const boundingRect = calculateBoundingRectForElements(activeElements);

    setResizableProperties({
      x: boundingRect.offsetX,
      y: boundingRect.offsetY,
      width: boundingRect.width,
      height: boundingRect.height,
      elements,
      connectingPathElements: getPathElements(
        slideInstance,
        findConnectingPaths(elements),
      ),
    });
  }, [activeElements, elements, slideInstance]);

  const handleDragStop = useCallback(
    ({ connectData }: DragEvent) => {
      let updates: ElementUpdate[];
      if (
        Object.values(elements).length === 1 &&
        Object.values(elements)[0].type === 'path' &&
        connectData
      ) {
        const elementId = Object.keys(elements)[0];
        const element = Object.values(elements)[0] as PathElement;

        const { lineHandlePositionName, connectToElementId } = connectData;

        updates = lineResizeUpdates(
          slideInstance,
          elementId,
          element,
          lineHandlePositionName,
          connectToElementId,
        );
      } else {
        updates = elementsUpdates(
          slideInstance,
          elements,
          elementOverrideUpdates,
        );
      }

      slideInstance.updateElements(updates);

      if (Object.values(elements).length === 1) {
        const element = Object.values(elements)[0];

        if (element.type === 'shape') {
          // If the element is a shape, update last size in the store

          const shapeSize = {
            width: element.width,
            height: element.height,
          };

          dispatch(setShapeSize({ kind: element.kind, size: shapeSize }));
        }
      }

      setResizableProperties(undefined);
      setElementOverride(undefined);
    },
    [
      dispatch,
      setElementOverride,
      slideInstance,
      elementOverrideUpdates,
      elements,
    ],
  );

  const handleDrag = useCallback(
    (elementOverrideUpdates: ElementOverrideUpdate[]) => {
      setElementOverride(elementOverrideUpdates);
      setElementOverrideUpdates(elementOverrideUpdates);
    },
    [setElementOverride],
  );

  if (activeElements.length === 0) {
    return null;
  }

  // if a single line is selected, show resize handles at start and end points
  if (
    activeElements.length === 1 &&
    activeElements[0].type === 'path' &&
    activeElements[0].kind === 'line'
  ) {
    const renderProperties = getRenderProperties(activeElements[0]);

    return (
      <>
        <ResizeHandleWrapper
          handlePosition={{
            name: 'start',
            x: renderProperties.points.start.x,
            y: renderProperties.points.start.y,
            elementId: elementIds[0],
          }}
          onDrag={handleDrag}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          resizableProperties={resizableProperties}
        />
        <ResizeHandleWrapper
          handlePosition={{
            name: 'end',
            x: renderProperties.points.end.x,
            y: renderProperties.points.end.y,
            elementId: elementIds[0],
          }}
          onDrag={handleDrag}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          resizableProperties={resizableProperties}
        />
      </>
    );
  }

  const boundingRect = calculateBoundingRectForElements(activeElements);

  const offsetX = boundingRect.offsetX;
  const offsetY = boundingRect.offsetY;
  const containerHeight = boundingRect.height;
  const containerWidth = boundingRect.width;
  const invertLockAspectRatio =
    activeElements.length > 1 || activeElements[0].type === 'image';

  return (
    <g
      data-testid="resize-element"
      transform={`translate(${offsetX} ${offsetY})`}
    >
      <ResizeHandleWrapper
        handlePosition={{
          name: 'top',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
        invertLockAspectRatio={invertLockAspectRatio}
      />

      <ResizeHandleWrapper
        handlePosition={{
          name: 'topRight',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
        invertLockAspectRatio={invertLockAspectRatio}
      />

      <ResizeHandleWrapper
        handlePosition={{
          name: 'right',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
        invertLockAspectRatio={invertLockAspectRatio}
      />

      <ResizeHandleWrapper
        handlePosition={{
          name: 'bottomRight',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
        invertLockAspectRatio={invertLockAspectRatio}
      />

      <ResizeHandleWrapper
        handlePosition={{
          name: 'bottom',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
        invertLockAspectRatio={invertLockAspectRatio}
      />

      <ResizeHandleWrapper
        handlePosition={{
          name: 'bottomLeft',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
        invertLockAspectRatio={invertLockAspectRatio}
      />

      <ResizeHandleWrapper
        handlePosition={{
          name: 'left',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
        invertLockAspectRatio={invertLockAspectRatio}
      />

      <ResizeHandleWrapper
        handlePosition={{
          name: 'topLeft',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
        invertLockAspectRatio={invertLockAspectRatio}
      />
    </g>
  );
}
