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
import { useWhiteboardSlideInstance } from '../../../../state';
import {
  useElementOverride,
  useSetElementOverride,
} from '../../../ElementOverridesProvider';
import { useLayoutState } from '../../../Layout';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { gridCellSize } from '../../constants';
import { DragEvent, ResizeHandle } from './ResizeHandle';
import { Dimensions, ResizeHandlePosition } from './types';
import { calculateDimensions } from './utils';

export type ResizeHandleWrapperProps = {
  handlePosition: ResizeHandlePosition;
  startDimensions: Dimensions | undefined;
  containerWidth: number;
  containerHeight: number;
  forceLockAspectRatio?: boolean;
  onDrag: Dispatch<Dimensions>;
  onDragStart: Dispatch<DragEvent>;
  onDragStop: Dispatch<DragEvent>;
};

export function ResizeHandleWrapper({
  handlePosition,
  startDimensions,
  containerWidth,
  containerHeight,
  forceLockAspectRatio,
  onDrag,
  onDragStart,
  onDragStop,
}: ResizeHandleWrapperProps) {
  const { isShowGrid } = useLayoutState();
  const { viewportWidth, viewportHeight } = useSvgCanvasContext();

  const handleDrag = useCallback(
    (event: DragEvent) => {
      if (startDimensions) {
        onDrag(
          calculateDimensions(
            handlePosition,
            event,
            startDimensions,
            viewportWidth,
            viewportHeight,
            forceLockAspectRatio,
            isShowGrid ? gridCellSize : undefined,
          ),
        );
      }
    },
    [
      onDrag,
      handlePosition,
      startDimensions,
      viewportWidth,
      viewportHeight,
      forceLockAspectRatio,
      isShowGrid,
    ],
  );

  return (
    <ResizeHandle
      containerHeight={containerHeight}
      containerWidth={containerWidth}
      handlePosition={handlePosition}
      onDrag={handleDrag}
      onDragStart={onDragStart}
      onDragStop={onDragStop}
    />
  );
}

export type ResizeElementProps = {
  elementId: string;
};

export function ResizeElement({ elementId }: ResizeElementProps) {
  const setElementOverride = useSetElementOverride();
  const slideInstance = useWhiteboardSlideInstance();

  const element = useElementOverride(elementId);

  const [startDimensions, setStartDimensions] = useState<
    Dimensions | undefined
  >();

  useUnmount(() => {
    if (startDimensions) {
      setElementOverride(elementId, undefined);
    }
  });

  const handleDragStart = useCallback(() => {
    const element = slideInstance.getElement(elementId);

    if (element?.type === 'shape') {
      setStartDimensions({
        x: element.position.x,
        y: element.position.y,
        height: element.height,
        width: element.width,
      });
    }
  }, [slideInstance, elementId]);

  const handleDragStop = useCallback(() => {
    if (element?.type !== 'shape' || !startDimensions) {
      return;
    }

    if (
      startDimensions.x !== element.position.x ||
      startDimensions.y !== element.position.y ||
      startDimensions.width !== element.width ||
      startDimensions.height !== element.height
    ) {
      slideInstance.updateElement(elementId, {
        position: { x: element.position.x, y: element.position.y },
        width: element.width,
        height: element.height,
      });
    }

    setStartDimensions(undefined);
    setElementOverride(elementId, undefined);
  }, [element, startDimensions, slideInstance, elementId, setElementOverride]);

  const handleDrag = useCallback(
    (dimensions: Dimensions) => {
      setElementOverride(elementId, {
        height: dimensions.height,
        width: dimensions.width,
        position: { x: dimensions.x, y: dimensions.y },
      });
    },
    [elementId, setElementOverride],
  );

  if (element?.type !== 'shape') {
    return null;
  }

  const offsetX = element.position.x;
  const offsetY = element.position.y;
  const height = element.height;
  const width = element.width;

  return (
    <g transform={`translate(${offsetX} ${offsetY})`}>
      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="top"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="topRight"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="right"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="bottomRight"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="bottom"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="bottomLeft"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="left"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="topLeft"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
      />
    </g>
  );
}
