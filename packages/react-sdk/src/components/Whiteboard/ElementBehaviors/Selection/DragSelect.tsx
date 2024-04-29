/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

import { styled, useTheme } from '@mui/material';
import { MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Point,
  ShapeElement,
  calculateBoundingRectForPoints,
  useWhiteboardSlideInstance,
} from '../../../../state';
import { useLayoutState } from '../../../Layout';
import RectangleDisplay from '../../../elements/rectangle/Display';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { calculateIntersect } from './calculateIntersect';

const NoInteraction = styled('g')({
  pointerEvents: 'none',
});

export function DragSelect() {
  const theme = useTheme();
  const slideInstance = useWhiteboardSlideInstance();
  const { dragSelectStartCoords, setDragSelectStartCoords } = useLayoutState();
  const { calculateSvgCoords } = useSvgCanvasContext();
  const [endCoords, setEndCoords] = useState<Point>();

  const shape: ShapeElement | undefined = useMemo(() => {
    if (dragSelectStartCoords === undefined || endCoords === undefined) {
      return undefined;
    }

    const { width, height } = calculateBoundingRectForPoints([
      dragSelectStartCoords,
      endCoords,
    ]);

    const x =
      endCoords.x >= dragSelectStartCoords.x
        ? dragSelectStartCoords.x
        : dragSelectStartCoords.x - width;

    const y =
      endCoords.y >= dragSelectStartCoords.y
        ? dragSelectStartCoords.y
        : dragSelectStartCoords.y - height;

    return {
      fillColor: `${theme.palette.primary.main}26`,
      height,
      kind: 'rectangle',
      position: { x, y },
      strokeColor: theme.palette.primary.main,
      strokeWidth: 1,
      text: '',
      type: 'shape',
      width,
    };
  }, [endCoords, dragSelectStartCoords, theme]);

  useEffect(() => {
    if (shape) {
      const activeElementIds = calculateIntersect(
        shape,
        slideInstance.getElements(slideInstance.getElementIds()),
      );

      // Add active elements in the order of their selection
      const sortedActiveElementIds: string[] = [];

      // Keep order of already selected elements
      const currentActiveElements = slideInstance.getActiveElementIds();

      for (const currentActiveElement of currentActiveElements) {
        if (activeElementIds.includes(currentActiveElement)) {
          sortedActiveElementIds.push(currentActiveElement);
        }
      }

      // Add new elements
      for (const activeElementId of activeElementIds) {
        if (sortedActiveElementIds.includes(activeElementId) === false) {
          sortedActiveElementIds.push(activeElementId);
        }
      }

      slideInstance.setActiveElementIds(sortedActiveElementIds);
    }
  }, [shape, slideInstance]);

  const handleMouseUp = useCallback(() => {
    setDragSelectStartCoords();
  }, [setDragSelectStartCoords]);

  const handleMouseMove = useCallback(
    (event: MouseEvent<SVGRectElement>) => {
      const point = calculateSvgCoords({ x: event.clientX, y: event.clientY });
      setEndCoords(point);
    },
    [calculateSvgCoords],
  );

  return (
    <>
      {shape && (
        <NoInteraction>
          <RectangleDisplay
            elementId="drag-selection"
            data-testid="drag-selection"
            readOnly
            active={false}
            {...shape}
          />
        </NoInteraction>
      )}
      <rect
        fill="transparent"
        height="100%"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        width="100%"
        data-testid="drag-select-layer"
      />
    </>
  );
}
