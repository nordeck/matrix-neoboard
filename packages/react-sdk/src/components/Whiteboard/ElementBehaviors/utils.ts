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
 * Takes elements overrides and provides elements updates.
 * Considers that some lines may become disconnected and provides updates to disconnect elements.
 *
 * @param slideInstance slide instance to load elements that are not in original selection but have to be modified
 * @param elements selected elements with updates
 * @param elementOverrideUpdates all elements overrides
 * @return elements updates
 */
export function elementsUpdates(
  slideInstance: WhiteboardSlideInstance,
  elements: Elements,
  elementOverrideUpdates: ElementOverrideUpdate[],
): ElementUpdate[] {
  const disconnectPathElementsObj = findPathElementsToDisconnect(
    elementOverrideUpdates,
    elements,
  );

  // Selected lines may become disconnected, apply disconnect patch
  const elementsUpdates: ElementUpdate[] = [];
  for (const { elementId, elementOverride } of elementOverrideUpdates) {
    let element: Element | undefined;
    if (elements[elementId]) {
      element = elements[elementId];
    } else {
      element = slideInstance.getElement(elementId);
    }
    if (element) {
      elementsUpdates.push({
        elementId,
        patch: {
          ...elementOverride,
          ...(element.type === 'path' &&
            disconnectPathElementsObj[elementId] &&
            disconnectPathElement(
              element,
              disconnectPathElementsObj[elementId],
            )),
        },
      });
    }
  }

  const disconnectShapeObject: Record<string, string[]> = {};
  for (const [lineElementId, shapeElementIds] of Object.entries(
    disconnectPathElementsObj,
  )) {
    for (const shapeElementId of shapeElementIds) {
      if (disconnectShapeObject[shapeElementId] === undefined) {
        disconnectShapeObject[shapeElementId] = [];
      }
      disconnectShapeObject[shapeElementId].push(lineElementId);
    }
  }

  // Disconnect shapes
  const shapesUpdates: ElementUpdate[] = [];
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
        shapesUpdates.push({
          elementId: shapeElementId,
          patch: {
            ...elementPatch,
          },
        });
      }
    }
  }

  return [...elementsUpdates, ...shapesUpdates];
}

function findPathElementsToDisconnect(
  elementOverrideUpdates: ElementOverrideUpdate[],
  elements: Elements,
): Record<string, string[]> {
  const res: Record<string, string[]> = {};

  for (const { elementId, elementOverride } of elementOverrideUpdates) {
    const element = elements[elementId];
    if (element && element.type === 'path' && elementOverride) {
      const ids = pathElementGetConnectedNotSelectedElements(element, elements);
      if (ids) {
        res[elementId] = ids;
      }
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
