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
  useWhiteboardSlideInstance,
} from '../../../../state';
import {
  ElementOverrideUpdate,
  createResetElementOverrides,
  useElementOverrides,
  useSetElementOverride,
} from '../../../ElementOverridesProvider';
import { useLayoutState } from '../../../Layout';
import { getRenderProperties } from '../../../elements/line/getRenderProperties';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { gridCellSize } from '../../constants';
import { DragEvent, ResizeHandle } from './ResizeHandle';
import { HandleProperties, ResizableProperties } from './types';
import { computeResizing } from './utils';

export type ResizeHandleWrapperProps = {
  handleProperties: HandleProperties;
  forceLockAspectRatio?: boolean;
  onDrag: Dispatch<ElementOverrideUpdate[]>;
  onDragStart: Dispatch<DragEvent>;
  onDragStop: Dispatch<DragEvent>;
  resizableProperties?: ResizableProperties;
};

export function ResizeHandleWrapper({
  handleProperties,
  forceLockAspectRatio,
  onDrag,
  onDragStart,
  onDragStop,
  resizableProperties,
}: ResizeHandleWrapperProps) {
  const { isShowGrid } = useLayoutState();
  const { viewportWidth, viewportHeight } = useSvgCanvasContext();

  const handleDrag = useCallback(
    (event: DragEvent) => {
      onDrag(
        computeResizing(
          handleProperties,
          event,
          viewportWidth,
          viewportHeight,
          forceLockAspectRatio,
          isShowGrid ? gridCellSize : undefined,
          resizableProperties,
        ),
      );
    },
    [
      forceLockAspectRatio,
      handleProperties,
      isShowGrid,
      onDrag,
      resizableProperties,
      viewportHeight,
      viewportWidth,
    ],
  );

  return (
    <ResizeHandle
      handleProperties={handleProperties}
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

  const [resizableProperties, setResizableProperties] =
    useState<ResizableProperties>();

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
    });
  }, [activeElements, elements]);

  const handleDragStop = useCallback(() => {
    slideInstance.updateElements(
      Object.entries(elements).map(([elementId, element]) => {
        return {
          elementId,
          patch: {
            position: element.position,
            width: element.type === 'shape' ? element.width : undefined,
            height: element.type === 'shape' ? element.height : undefined,
            points: element.type === 'path' ? element.points : undefined,
          },
        };
      }),
    );

    setResizableProperties(undefined);
    setElementOverride(createResetElementOverrides(elementIds));
  }, [elementIds, elements, setElementOverride, slideInstance]);

  const handleDrag = useCallback(
    (elementOverrideUpdates: ElementOverrideUpdate[]) =>
      setElementOverride(elementOverrideUpdates),
    [setElementOverride],
  );

  if (activeElements.length === 0) {
    return null;
  }

  if (
    activeElements.length === 1 &&
    activeElements[0].type === 'path' &&
    activeElements[0].kind === 'line'
  ) {
    const renderProperties = getRenderProperties(activeElements[0]);

    return (
      <>
        <ResizeHandleWrapper
          handleProperties={{
            handlePosition: 'start',
            handlePositionX: renderProperties.points.start.x,
            handlePositionY: renderProperties.points.start.y,
          }}
          onDrag={handleDrag}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          resizableProperties={resizableProperties}
        />
        <ResizeHandleWrapper
          handleProperties={{
            handlePosition: 'end',
            handlePositionX: renderProperties.points.end.x,
            handlePositionY: renderProperties.points.end.y,
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

  return (
    <g
      data-testid="resize-element"
      transform={`translate(${offsetX} ${offsetY})`}
    >
      <ResizeHandleWrapper
        handleProperties={{
          handlePosition: 'top',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
      />

      <ResizeHandleWrapper
        handleProperties={{
          handlePosition: 'topRight',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
      />

      <ResizeHandleWrapper
        handleProperties={{
          handlePosition: 'right',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
      />

      <ResizeHandleWrapper
        handleProperties={{
          handlePosition: 'bottomRight',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
      />

      <ResizeHandleWrapper
        handleProperties={{
          handlePosition: 'bottom',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
      />

      <ResizeHandleWrapper
        handleProperties={{
          handlePosition: 'bottomLeft',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
      />

      <ResizeHandleWrapper
        handleProperties={{
          handlePosition: 'left',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
      />

      <ResizeHandleWrapper
        handleProperties={{
          handlePosition: 'topLeft',
          containerWidth,
          containerHeight,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        resizableProperties={resizableProperties}
      />
    </g>
  );
}
