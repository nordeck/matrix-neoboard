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

import { clamp } from 'lodash';
import { isDefined } from '../../../../lib';
import {
  calculateBoundingRectForElements,
  PathElement,
} from '../../../../state/crdt/documents/elements';
import { BoundingRect, Point } from '../../../../state/crdt/documents/point';
import { Elements } from '../../../../state/types';
import { ElementOverrideUpdate } from '../../../ElementOverridesProvider';
import { ElementOverride } from '../../../ElementOverridesProvider/ElementOverridesProvider';
import { snapToGrid } from '../../Grid';
import { gridCellSize } from '../../constants';
import {
  computeResizingConnectingPathElementOverDeltaPoints,
  computeResizingConnectingPathElements,
} from '../Resizable';

export function calculateElementOverrideUpdates(
  elements: Elements,
  deltaX: number,
  deltaY: number,
  viewportWidth: number,
  viewportHeight: number,
  connectingPathElements?: Record<string, PathElement>,
  boundingRect?: BoundingRect,
): ElementOverrideUpdate[] {
  const {
    offsetX,
    offsetY,
    width: rectWidth,
    height: rectHeight,
  } = calculateBoundingRectForElements(Object.values(elements));

  const rectX = offsetX + deltaX;
  const rectY = offsetY + deltaY;

  const overrides: ElementOverrideUpdate[] = Object.entries(elements).map(
    ([elemId, element]) => {
      const x = element.position.x + deltaX;
      const y = element.position.y + deltaY;

      return {
        elementId: elemId,
        elementOverride: {
          position: {
            x: clamp(x, x - rectX, viewportWidth - 1 - (rectX + rectWidth - x)),
            y: clamp(
              y,
              y - rectY,
              viewportHeight - 1 - (rectY + rectHeight - y),
            ),
          },
        },
      };
    },
  );

  if (connectingPathElements && boundingRect) {
    overrides.push(
      ...computeResizingConnectingPathElements(
        connectingPathElements,
        elements,
        {
          x: boundingRect.offsetX,
          y: boundingRect.offsetY,
          width: boundingRect.width,
          height: boundingRect.height,
        },
        {
          x: rectX,
          y: rectY,
          width: rectWidth,
          height: rectHeight,
        },
      ),
    );
  }

  return overrides;
}

export function snapToGridElementOverrideUpdates(
  elementOverrideUpdates: ElementOverrideUpdate[],
  elements: Elements,
  connectingPathElements: Record<string, PathElement>,
): ElementOverrideUpdate[] {
  return elementOverrideUpdates.map(({ elementId, elementOverride }) => {
    let pathElement: PathElement | undefined;
    if (elements[elementId]?.type === 'path') {
      pathElement = elements[elementId];
    } else if (connectingPathElements[elementId]) {
      pathElement = connectingPathElements[elementId];
    }

    if (
      pathElement &&
      (pathElement.connectedElementStart || pathElement.connectedElementEnd) &&
      elementOverride
    ) {
      const deltaPoints: (Point | undefined)[] = [];
      const connectedElements = [
        pathElement.connectedElementStart,
        pathElement.connectedElementEnd,
      ];
      for (let i = 0; i < connectedElements.length; i++) {
        const connectedElementId = connectedElements[i];

        const connectedElement = connectedElementId
          ? elements[connectedElementId]
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

      let newOverride: ElementOverride;
      if (deltaPoints.filter(isDefined).length > 0) {
        newOverride = computeResizingConnectingPathElementOverDeltaPoints(
          {
            position: elementOverride.position ?? pathElement.position,
            points: elementOverride.points ?? pathElement.points,
          },
          deltaPoints,
        );
      } else {
        const x = snapToGrid(pathElement.position.x, gridCellSize);
        const y = snapToGrid(pathElement.position.y, gridCellSize);
        newOverride = { position: { x, y } };
      }

      return {
        elementId,
        elementOverride: newOverride,
      };
    } else {
      const element = elements[elementId];
      const x = snapToGrid(element.position.x, gridCellSize);
      const y = snapToGrid(element.position.y, gridCellSize);
      return { elementId, elementOverride: { position: { x, y } } };
    }
  });
}
