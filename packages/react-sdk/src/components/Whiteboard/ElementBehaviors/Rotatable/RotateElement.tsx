/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { useState } from 'react';
import { useUnmount } from 'react-use';
import {
  calculateBoundingRectForElements,
  calculateBoundingRectForPoints,
  ElementBase,
  findConnectingPaths,
  ImageElement,
  Point,
  ShapeElement,
  useWhiteboardSlideInstance,
} from '../../../../state';
import { isRotateableElement } from '../../../../state/crdt/documents/elements';
import {
  createResetElementOverrides,
  ElementOverrideUpdate,
  useElementOverrides,
  useSetElementOverride,
} from '../../../ElementOverridesProvider';
import { useLayoutState } from '../../../Layout';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { elementsUpdates, getPathElements } from '../utils';
import { RotateHandler } from './RotateHandler';
import { rotatePoint } from './rotatorMath';

export type DragEvent = {
  newAngle: number;
  referenceAngle: number;
  lockAspectRatio: boolean;
};

export type RotateElementProps = {
  elementId: string;
};

export type Rotation = {
  angle: number;
};

export type RotateProperties = Rotation & {
  element: ElementBase;
};

export function RotateElement({ elementId }: RotateElementProps) {
  const setElementOverride = useSetElementOverride();
  const elements = useElementOverrides([elementId]);
  const activeElements = Object.values(elements);
  const { viewportWidth, viewportHeight } = useSvgCanvasContext();
  const [elementOverrideUpdates, setElementOverrideUpdates] = useState<
    ElementOverrideUpdate[]
  >([]);

  const boundingRect = calculateBoundingRectForElements(activeElements);
  const slideInstance = useWhiteboardSlideInstance();

  const containerHeight = boundingRect.height;
  const containerWidth = boundingRect.width;
  const offsetX = boundingRect.offsetX;
  const offsetY = boundingRect.offsetY;

  const { isRotating, setIsRotating } = useLayoutState();

  useUnmount(() => {
    setElementOverride(createResetElementOverrides([elementId]));
  });

  const handleDrag = (event: DragEvent) => {
    const update: ElementOverrideUpdate = {
      elementId,
      elementOverride: {
        rotation: event.newAngle,
      },
    };

    const updates = [update];

    // update the connected arrows
    updates.push(...rotateConnectedPaths(event));

    setElementOverride(updates);
    setElementOverrideUpdates(updates);
  };

  function rotateConnectedPaths(event: DragEvent) {
    const pathElements = getPathElements(
      slideInstance,
      findConnectingPaths(elements),
    );

    const res: ElementOverrideUpdate[] = [];

    for (const [pathElementId, pathElement] of Object.entries(pathElements)) {
      if (
        !(pathElement.connectedElementStart || pathElement.connectedElementEnd)
      ) {
        continue;
      }

      // the initial position of the path before rotating it's points
      let linePosition = {
        position: pathElement.position,
        points: pathElement.points,
      };

      // helper to rotate a point over the shape, taking into account the
      // initial shape's rotation (refAngle)
      const rotateConnectorPoint = (
        connector: Point,
        elementWithConnectorPoints: ShapeElement | ImageElement,
      ): Point => {
        const center = {
          x:
            elementWithConnectorPoints.position.x +
            elementWithConnectorPoints.width / 2,
          y:
            elementWithConnectorPoints.position.y +
            elementWithConnectorPoints.height / 2,
        };
        const refAngle = event.referenceAngle;
        const newAngle = event.newAngle;
        let rotatedPoint = rotatePoint(connector, center, -refAngle);
        rotatedPoint = rotatePoint(rotatedPoint, center, newAngle);
        rotatedPoint.x -= linePosition.position.x;
        rotatedPoint.y -= linePosition.position.y;
        return rotatedPoint;
      };

      const rotateConnector = (
        connectedElementId: string | undefined,
        type: 'start' | 'end',
      ) => {
        if (!connectedElementId) return;
        if (!elements[connectedElementId]) return;

        const elementWithConnectorPoints = elements[connectedElementId];
        const idx = type === 'start' ? 0 : 1;
        const conenctedPoint = {
          x: pathElement.position.x + pathElement.points[idx].x,
          y: pathElement.position.y + pathElement.points[idx].y,
        };

        if (isRotateableElement(elementWithConnectorPoints)) {
          const rotatedPoint = rotateConnectorPoint(
            conenctedPoint,
            elementWithConnectorPoints,
          );

          // adjust the entire path since we know the rotated position here

          let newPoints: Point[];
          const start = linePosition.points[0];
          const end = linePosition.points[1];
          if (type === 'start') {
            newPoints = [rotatedPoint, end];
          } else {
            newPoints = [start, rotatedPoint];
          }

          const boundingRect = calculateBoundingRectForPoints(newPoints);

          linePosition = {
            position: {
              x: linePosition.position.x + boundingRect.offsetX,
              y: linePosition.position.y + boundingRect.offsetY,
            },
            points: newPoints.map((point) => ({
              x: point.x - boundingRect.offsetX,
              y: point.y - boundingRect.offsetY,
            })),
          };
        }
      };

      rotateConnector(pathElement.connectedElementStart, 'start');
      rotateConnector(pathElement.connectedElementEnd, 'end');
      res.push({
        elementId: pathElementId,
        elementOverride: linePosition,
      });
    }

    return res;
  }

  const activeElement = activeElements[0] as ShapeElement | ImageElement;

  const handleDragStart = () => {
    if (!isRotateableElement(activeElement)) return;
    setIsRotating(true);
  };

  const handleDragStop = () => {
    const updates = elementsUpdates(
      slideInstance,
      elements,
      elementOverrideUpdates,
      {},
    );
    slideInstance.updateElements(updates);

    setElementOverride(undefined);
    setIsRotating(false);
  };

  if (!(activeElements.length === 1)) return null;
  if (!isRotateableElement(activeElement)) return null;

  return (
    <g
      data-testid="rotate-element"
      transform={`translate(${offsetX} ${offsetY})`}
    >
      <RotateHandler
        handlePosition={{
          containerWidth,
          containerHeight,
          offsetX,
          offsetY,
          rotation: activeElement.rotation ?? 0,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
      ></RotateHandler>

      {/* Helps to show the "grabbing" cursor everywhere */}
      {isRotating && (
        <rect
          id="rotate-handle-grab-thing"
          data-testid={`rotate-handle-grab-thing`}
          cursor={'grabbing'}
          fill="transparent"
          height={viewportHeight}
          transform={`translate(${-offsetX} ${-offsetY})`}
          width={viewportWidth}
        />
      )}
    </g>
  );
}
