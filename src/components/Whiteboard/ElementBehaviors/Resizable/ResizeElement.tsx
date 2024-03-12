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
  useElementOverride,
  useSetElementOverride,
} from '../../../ElementOverridesProvider';
import { useLayoutState } from '../../../Layout';
import { getRenderProperties } from '../../../elements/line/getRenderProperties';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { gridCellSize } from '../../constants';
import { DragEvent, ResizeHandle } from './ResizeHandle';
import {
  Dimensions,
  LineElementProps,
  PolylineAndShapeElementsProps,
} from './types';
import { calculateDimensions } from './utils';

export type ResizeHandleWrapperProps = {
  startDimensions: Dimensions | undefined;
  forceLockAspectRatio?: boolean;
  onDrag: Dispatch<Dimensions>;
  onDragStart: Dispatch<DragEvent>;
  onDragStop: Dispatch<DragEvent>;
} & (LineElementProps | PolylineAndShapeElementsProps);

export function ResizeHandleWrapper({
  startDimensions,
  forceLockAspectRatio,
  onDrag,
  onDragStart,
  onDragStop,
  ...rest
}: ResizeHandleWrapperProps) {
  const { isShowGrid } = useLayoutState();
  const { viewportWidth, viewportHeight } = useSvgCanvasContext();

  const handleDrag = useCallback(
    (event: DragEvent) => {
      if (startDimensions) {
        onDrag(
          calculateDimensions(
            rest.handlePosition,
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
      startDimensions,
      onDrag,
      rest.handlePosition,
      viewportWidth,
      viewportHeight,
      forceLockAspectRatio,
      isShowGrid,
    ],
  );

  return rest.elementKind === 'line' ? (
    <ResizeHandle
      onDrag={handleDrag}
      onDragStart={onDragStart}
      onDragStop={onDragStop}
      elementKind={rest.elementKind}
      handlePosition={rest.handlePosition}
      handlePositionX={rest.handlePositionX}
      handlePositionY={rest.handlePositionY}
    />
  ) : (
    <ResizeHandle
      onDrag={handleDrag}
      onDragStart={onDragStart}
      onDragStop={onDragStop}
      elementKind={rest.elementKind}
      handlePosition={rest.handlePosition}
      containerWidth={rest.containerWidth}
      containerHeight={rest.containerHeight}
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
      setElementOverride([{ elementId, elementOverride: undefined }]);
    }
  });

  const handleDragStart = useCallback(() => {
    const element = slideInstance.getElement(elementId);

    if (element?.type === 'shape') {
      setStartDimensions({
        elementKind: element.kind,
        x: element.position.x,
        y: element.position.y,
        height: element.height,
        width: element.width,
      });
    } else if (element?.type === 'path') {
      const boundingRect = calculateBoundingRectForElements([element]);

      setStartDimensions({
        elementKind: element.kind,
        x: boundingRect.offsetX,
        y: boundingRect.offsetY,
        height: boundingRect.height,
        width: boundingRect.width,
        points: element.points,
      });
    }
  }, [slideInstance, elementId]);

  const handleDragStop = useCallback(() => {
    if (!element || !startDimensions) {
      return;
    }

    if (
      element.type === 'shape' &&
      (startDimensions.x !== element.position.x ||
        startDimensions.y !== element.position.y ||
        startDimensions.width !== element.width ||
        startDimensions.height !== element.height)
    ) {
      slideInstance.updateElement(elementId, {
        position: { x: element.position.x, y: element.position.y },
        width: element.width,
        height: element.height,
      });
    } else if (element.type === 'path') {
      slideInstance.updateElement(elementId, {
        position: { x: element.position.x, y: element.position.y },
        points: element.points,
      });
    }

    setStartDimensions(undefined);
    setElementOverride([{ elementId, elementOverride: undefined }]);
  }, [element, startDimensions, slideInstance, elementId, setElementOverride]);

  const handleDrag = useCallback(
    (dimensions: Dimensions) => {
      if (!startDimensions) {
        return;
      }

      if (element?.type === 'shape') {
        setElementOverride([
          {
            elementId,
            elementOverride: {
              height: dimensions.height,
              width: dimensions.width,
              position: { x: dimensions.x, y: dimensions.y },
            },
          },
        ]);
      } else if (
        dimensions.elementKind === 'line' ||
        dimensions.elementKind === 'polyline'
      ) {
        setElementOverride([
          {
            elementId,
            elementOverride: {
              position: { x: dimensions.x, y: dimensions.y },
              points: dimensions.points,
            },
          },
        ]);
      }
    },
    [element, elementId, setElementOverride, startDimensions],
  );

  if (!element) {
    return null;
  }

  if (element.kind === 'line') {
    const renderProperties = getRenderProperties(element);

    return (
      <>
        <ResizeHandleWrapper
          handlePosition="start"
          handlePositionX={renderProperties.points.start.x}
          handlePositionY={renderProperties.points.start.y}
          onDrag={handleDrag}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          startDimensions={startDimensions}
          elementKind={element.kind}
        />
        <ResizeHandleWrapper
          handlePosition="end"
          handlePositionX={renderProperties.points.end.x}
          handlePositionY={renderProperties.points.end.y}
          onDrag={handleDrag}
          onDragStart={handleDragStart}
          onDragStop={handleDragStop}
          startDimensions={startDimensions}
          elementKind={element.kind}
        />
      </>
    );
  }

  const boundingRect = calculateBoundingRectForElements([element]);

  const offsetX = boundingRect.offsetX;
  const offsetY = boundingRect.offsetY;
  const height = boundingRect.height;
  const width = boundingRect.width;

  return (
    <g
      data-testid="resize-element"
      transform={`translate(${offsetX} ${offsetY})`}
    >
      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="top"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
        elementKind={element.kind}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="topRight"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
        elementKind={element.kind}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="right"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
        elementKind={element.kind}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="bottomRight"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
        elementKind={element.kind}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="bottom"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
        elementKind={element.kind}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="bottomLeft"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
        elementKind={element.kind}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="left"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
        elementKind={element.kind}
      />

      <ResizeHandleWrapper
        containerHeight={height}
        containerWidth={width}
        handlePosition="topLeft"
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
        startDimensions={startDimensions}
        elementKind={element.kind}
      />
    </g>
  );
}
