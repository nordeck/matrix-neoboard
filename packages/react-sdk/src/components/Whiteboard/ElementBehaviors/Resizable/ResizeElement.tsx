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

  const handleDrag = useCallback(
    (event: DragEvent) => {
      onDrag(
        computeResizing(
          handlePosition,
          event,
          viewportWidth,
          viewportHeight,
          invertLockAspectRatio,
          isShowGrid ? gridCellSize : undefined,
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
            width:
              element.type === 'shape' || element.type === 'image'
                ? element.width
                : undefined,
            height:
              element.type === 'shape' || element.type === 'image'
                ? element.height
                : undefined,
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
