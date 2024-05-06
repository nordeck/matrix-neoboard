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
import { calculateBoundingRectForElements } from '../../../../state/crdt/documents/elements';
import { Elements } from '../../../../state/types';
import { ElementOverrideUpdate } from '../../../ElementOverridesProvider';

export function calculateElementOverrideUpdates(
  elements: Elements,
  deltaX: number,
  deltaY: number,
  viewportWidth: number,
  viewportHeight: number,
): ElementOverrideUpdate[] {
  const {
    offsetX,
    offsetY,
    width: rectWidth,
    height: rectHeight,
  } = calculateBoundingRectForElements(Object.values(elements));

  const rectX = offsetX + deltaX;
  const rectY = offsetY + deltaY;

  return Object.entries(elements).map(([elemId, elem]) => {
    const x = elem.position.x + deltaX;
    const y = elem.position.y + deltaY;

    return {
      elementId: elemId,
      elementOverride: {
        position: {
          x: clamp(x, x - rectX, viewportWidth - 1 - (rectX + rectWidth - x)),
          y: clamp(y, y - rectY, viewportHeight - 1 - (rectY + rectHeight - y)),
        },
      },
    };
  });
}
