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
import {
  calculateBoundingRectForElements,
  PathElement,
} from '../../../../state/crdt/documents/elements';
import { BoundingRect } from '../../../../state/crdt/documents/point';
import { Elements } from '../../../../state/types';
import { ElementOverrideUpdate } from '../../../ElementOverridesProvider';
import { computeResizingConnectingPathElements } from '../Resizable';
import { pathElementGetConnectedNotSelectedElements } from '../utils';

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

  const res: ElementOverrideUpdate[] = Object.entries(elements).map(
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
        pathElementDisconnectElements:
          pathElementGetConnectedNotSelectedElements(element, elements),
      };
    },
  );

  if (connectingPathElements && boundingRect) {
    const otherOvers = computeResizingConnectingPathElements(
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
    );
    res.push(...otherOvers);
  }

  return res;
}
