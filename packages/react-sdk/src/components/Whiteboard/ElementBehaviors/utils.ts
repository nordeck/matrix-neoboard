/*
 * Copyright 2025 Nordeck IT + Consulting GmbH
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

import { uniq } from 'lodash';
import {
  disconnectPathElement,
  disconnectShapeElement,
  Element,
  Elements,
  PathElement,
  ShapeElement,
  WhiteboardSlideInstance,
} from '../../../state';
import { ElementUpdate } from '../../../state/types';
import {
  connectPathElement,
  connectShapeElement,
  disconnectPathElementOnPosition,
} from '../../../state/utils';
import { ElementOverrideUpdate } from '../../ElementOverridesProvider';
import { LineElementHandlePositionName } from './Resizable/types';

/**
 * Provides updates to line resize.
 * Provides connection changes to line element and connected/disconnected element.
 *
 * @param slideInstance slide instance
 * @param pathElementId path element id
 * @param pathElement path element (currently line only)
 * @param position start or end position of line resized
 * @param connectToElementId if defined an element id to connect to, otherwise disconnect line on position
 * @return line element position, points updates, connection start and end updates, an element to connect to connection updates
 */
export function lineResizeUpdates(
  slideInstance: WhiteboardSlideInstance,
  pathElementId: string,
  pathElement: PathElement,
  position: LineElementHandlePositionName,
  connectToElementId: string | undefined,
): ElementUpdate[] {
  const patches: ElementUpdate[] = [];

  if (!connectToElementId) {
    const pathPatch = disconnectPathElementOnPosition(pathElement, position);
    patches.push({
      elementId: pathElementId,
      patch: {
        position: pathElement.position,
        points: pathElement.points,
        ...pathPatch,
      },
    });

    let shapeElementData: [string, ShapeElement] | undefined;
    if (pathElement.connectedElementStart || pathElement.connectedElementEnd) {
      const shapeElementId =
        position === 'start'
          ? pathElement.connectedElementStart
          : pathElement.connectedElementEnd;
      if (shapeElementId) {
        const targetElement = slideInstance.getElement(shapeElementId);
        if (targetElement?.type === 'shape') {
          shapeElementData = [shapeElementId, targetElement];
        }
      }
    } else {
      shapeElementData = undefined;
    }

    if (shapeElementData) {
      const [shapeElementId, shapeElement] = shapeElementData;
      const shapePatch = disconnectShapeElement(shapeElement, [pathElementId]);
      if (shapePatch) {
        patches.push({
          elementId: shapeElementId,
          patch: shapePatch,
        });
      }
    }
  } else {
    const shapeElement = slideInstance.getElement(connectToElementId);

    if (shapeElement && shapeElement.type === 'shape') {
      const pathPatch = connectPathElement(
        pathElement,
        position,
        connectToElementId,
      );
      patches.push({
        elementId: pathElementId,
        patch: {
          position: pathElement.position,
          points: pathElement.points,
          ...pathPatch,
        },
      });

      const shapePatch = connectShapeElement(shapeElement, pathElementId);
      if (shapePatch) {
        patches.push({
          elementId: connectToElementId,
          patch: shapePatch,
        });
      }
    }
  }

  return patches;
}

/**
 * Creates elements with all updates applied:
 *  - original updates because of move or resize elements
 *  - connecting paths resizing
 *  - selected lines disconnect to shapes outside of selection
 *
 * @param slideInstance slide instance to load elements that are not in original selection but have to be modified
 * @param elements selected elements with updates
 * @param elementOverrideUpdates all updates including changes to connecting paths and shapes disconnections
 * @return elements including connecting paths, extra shapes disconnected
 */
export function elementsWithUpdates(
  slideInstance: WhiteboardSlideInstance,
  elements: Elements,
  elementOverrideUpdates: ElementOverrideUpdate[],
): Elements {
  const disconnectPathElements: [string, string[]][] =
    findPathElementsToDisconnect(elementOverrideUpdates);
  const disconnectLineObject = Object.fromEntries(disconnectPathElements);

  // Selected lines may become disconnected, apply disconnect patch
  const newOverrideElements: [string, Element][] = Object.entries(elements).map(
    ([elementId, element]) => {
      const elementIds: string[] | undefined = disconnectLineObject[elementId];
      if (!elementIds) {
        return [elementId, element];
      }

      if (element.type !== 'path') {
        return [elementId, element];
      }

      const elementPatch = disconnectPathElement(element, elementIds);
      if (!elementPatch) {
        return [elementId, element];
      }

      return [
        elementId,
        {
          ...element,
          ...elementPatch,
        },
      ];
    },
  );

  // Connecting lines overrides
  const otherOverrides: [string, Element][] = [];
  for (const { elementId, elementOverride } of elementOverrideUpdates.filter(
    (u) => elements[u.elementId] === undefined,
  )) {
    const element = slideInstance.getElement(elementId);
    if (element) {
      otherOverrides.push([
        elementId,
        {
          ...element,
          ...elementOverride,
        },
      ]);
    }
  }

  const disconnectShapeObject: Record<string, string[]> = {};
  for (const [lineElementId, shapeElementIds] of disconnectPathElements) {
    for (const shapeElementId of shapeElementIds) {
      if (disconnectShapeObject[shapeElementId] === undefined) {
        disconnectShapeObject[shapeElementId] = [];
      }
      disconnectShapeObject[shapeElementId].push(lineElementId);
    }
  }

  // Shapes that are outside of selection elements and will be disconnected from selected lines
  const shapeOverrides: [string, Element][] = [];
  for (const [shapeElementId, disconnectLineIds] of Object.entries(
    disconnectShapeObject,
  )) {
    const shapeElement = slideInstance.getElement(shapeElementId);
    if (shapeElement && shapeElement.type === 'shape') {
      const elementPatch = disconnectShapeElement(
        shapeElement,
        disconnectLineIds,
        true,
      );

      if (elementPatch) {
        shapeOverrides.push([
          shapeElementId,
          {
            ...shapeElement,
            ...elementPatch,
          },
        ]);
      }
    }
  }

  return Object.fromEntries([
    ...newOverrideElements,
    ...otherOverrides,
    ...shapeOverrides,
  ]);
}

function findPathElementsToDisconnect(
  elementOverrideUpdates: ElementOverrideUpdate[],
): [string, string[]][] {
  const res: [string, string[]][] = [];

  for (const {
    elementId,
    pathElementDisconnectElements,
  } of elementOverrideUpdates) {
    if (
      pathElementDisconnectElements &&
      pathElementDisconnectElements.length > 0
    ) {
      res.push([elementId, pathElementDisconnectElements]);
    }
  }

  return res;
}

/**
 * For path element it finds connected but not selected element ids
 * @param element path element
 * @param elements ids of elements, undefined otherwise
 */
export function pathElementGetConnectedNotSelectedElements(
  element: Element,
  elements: Elements,
): string[] | undefined {
  let res: string[] | undefined;

  if (
    element.type === 'path' &&
    (element.connectedElementStart || element.connectedElementEnd)
  ) {
    const elementIds: string[] = uniq(
      [element.connectedElementStart, element.connectedElementEnd]
        .filter((eId) => eId !== undefined)
        .filter((eId) => elements[eId] === undefined),
    );

    if (elementIds.length > 0) {
      res = elementIds;
    }
  }

  return res;
}

export function getPathElements(
  slideInstance: WhiteboardSlideInstance,
  elementIds: string[],
): Record<string, PathElement> {
  const entries: [string, PathElement][] = [];

  for (const elementId of elementIds) {
    const element = slideInstance.getElement(elementId);
    if (element && element.type === 'path') {
      entries.push([elementId, element]);
    }
  }

  return Object.fromEntries(entries);
}
