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

import {
  calculateBoundingRectForPoints,
  Elements,
  findConnectingPaths,
  ImageElement,
  Point,
  ShapeElement,
  WhiteboardSlideInstance,
} from '../../../../state';
import {
  isRotateableElement,
  PathElement,
} from '../../../../state/crdt/documents/elements';
import { ElementOverrideUpdate } from '../../../ElementOverridesProvider';
import { getPathElements } from '../utils';
import { RotationHandleDragEvent } from './RotateHandler';
import { rotatePoint } from './rotatorMath';

// Helper to rotate a point over the shape to
// mach the new shape's rotation angle from the drag event.
const rotateConnectorPoint = (
  connector: Point,
  elementWithConnectorPoints: ShapeElement | ImageElement,
  event: RotationHandleDragEvent,
  linePosition: { position: Point; points: Point[] },
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
  const rotatedPoint = rotatePoint(connector, center, newAngle - refAngle);
  rotatedPoint.x -= linePosition.position.x;
  rotatedPoint.y -= linePosition.position.y;
  return rotatedPoint;
};

type LinePosition = { position: Point; points: Point[] };

const rotateConnector = (
  elements: Elements,
  pathElement: PathElement,
  connectedElementId: string | undefined,
  type: 'start' | 'end',
  event: RotationHandleDragEvent,
  linePosition: LinePosition,
): LinePosition => {
  if (!connectedElementId) return linePosition;
  if (!elements[connectedElementId]) return linePosition;

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
      event,
      linePosition,
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

    return {
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

  // the shape wasn't rotateable so we didn't try to rotate the connector
  return linePosition;
};

export function rotateConnectedPaths(
  event: RotationHandleDragEvent,
  slideInstance: WhiteboardSlideInstance,
  elements: Elements,
): ElementOverrideUpdate[] {
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

    // Rotate  start and end.
    // The line can be connected to the same rotating object with both ends.

    linePosition = rotateConnector(
      elements,
      pathElement,
      pathElement.connectedElementStart,
      'start',
      event,
      linePosition,
    );

    linePosition = rotateConnector(
      elements,
      pathElement,
      pathElement.connectedElementEnd,
      'end',
      event,
      linePosition,
    );

    res.push({
      elementId: pathElementId,
      elementOverride: linePosition,
    });
  }

  return res;
}
