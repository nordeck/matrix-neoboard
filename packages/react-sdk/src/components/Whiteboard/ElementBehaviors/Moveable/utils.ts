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
  BoundingRect,
  calculateBoundingRectForElements,
  Element,
  Elements,
  PathElement,
  Point,
} from '../../../../state';
import {
  ElementOverride,
  ElementOverrideUpdate,
} from '../../../ElementOverridesProvider';
import { snapToGrid } from '../../Grid';
import { gridCellSize } from '../../constants';
import {
  computeResizingConnectingPathElementOverDeltaPoints,
  computeResizingConnectingPathElements,
} from '../Resizable';

export function calculateElementOverrideUpdates(
  elements: Elements,
  rectX: number,
  rectY: number,
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

  const deltaX = rectX - offsetX;
  const deltaY = rectY - offsetY;

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

/**
 * Changes elements overrides to snap to the grid.
 * Connected path elements are resized to follow snapping changes of connected elements.
 *
 * @param elementOverrideUpdates elements overrides
 * @param elements selected elements with overrides
 * @param connectingPathElements not selected connecting paths
 * @return elements overrides with snapping applied
 */
export function snapToGridElementOverrideUpdates(
  elementOverrideUpdates: ElementOverrideUpdate[],
  elements: Elements,
  connectingPathElements: Record<string, PathElement>,
): ElementOverrideUpdate[] {
  return elementOverrideUpdates.map(({ elementId, elementOverride }) => {
    let pathElement: PathElement | undefined;
    let isPathElementSelected: boolean = false;

    if (elements[elementId]?.type === 'path') {
      pathElement = elements[elementId];
      isPathElementSelected = true;
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

        let elementToFollow: Element | undefined;
        if (connectedElement) {
          elementToFollow = connectedElement;
        } else if (isPathElementSelected) {
          // find and use another connected selected element if any
          elementToFollow = connectedElements
            .map((elementId) => (elementId ? elements[elementId] : undefined))
            .find(isDefined);
        }

        if (elementToFollow) {
          deltaPoints.push({
            x:
              snapToGrid(elementToFollow.position.x, gridCellSize) -
              elementToFollow.position.x,
            y:
              snapToGrid(elementToFollow.position.y, gridCellSize) -
              elementToFollow.position.y,
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
