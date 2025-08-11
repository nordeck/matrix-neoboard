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
  findFrameToAttach,
  FrameElement,
  PathElement,
  ShapeElement,
  WhiteboardSlideInstance,
} from '../../../state';
import { ElementUpdate } from '../../../state/types';
import {
  attachElementFrame,
  attachFrameElements,
  connectPathElement,
  connectShapeElement,
  disconnectPathElementOnPosition,
  FrameElementsChanges,
} from '../../../state/utils';
import {
  ElementOverride,
  ElementOverrideUpdate,
  mergeElementAndOverride,
} from '../../ElementOverridesProvider';

/**
 * Provides an update to the line resized. It includes element position, points, connect/disconnect to a shape.
 * Provides updates to the shapes regarding been connected/disconnected to the resized line.
 *
 * @param slideInstance slide instance
 * @param pathElementId path element id
 * @param pathElement path element (currently line only)
 * @param position start or end connection position of the line resized
 * @param connectToElementId if defined a shape element id to connect to, otherwise line to be disconnected on position if connection exists
 * @return line element position, points updates, connection start and end updates, elements to connect/disconnect updates
 */
export function lineResizeUpdates(
  slideInstance: WhiteboardSlideInstance,
  pathElementId: string,
  pathElement: PathElement,
  position: 'start' | 'end',
  connectToElementId: string | undefined,
): ElementUpdate[] {
  const patches: ElementUpdate[] = [];

  if (!connectToElementId) {
    // Provides update with position, points, shape disconnect to a line
    patches.push({
      elementId: pathElementId,
      patch: {
        position: pathElement.position,
        points: pathElement.points,
        ...disconnectPathElementOnPosition(pathElement, position),
      },
    });

    // Provides update to disconnect to a shape
    const shapePatch = disconnectConnectedShapeFromLine(
      slideInstance,
      pathElementId,
      pathElement,
      position,
    );
    if (shapePatch) {
      patches.push(shapePatch);
    }
  } else {
    const shapeElement = slideInstance.getElement(connectToElementId);
    const shapeElementFound = shapeElement && shapeElement.type === 'shape';

    // Provides update with position, points, shape connect to a line
    patches.push({
      elementId: pathElementId,
      patch: {
        position: pathElement.position,
        points: pathElement.points,
        ...(shapeElementFound
          ? connectPathElement(pathElement, position, connectToElementId)
          : undefined),
      },
    });

    // Provides updates to connect to a shape, disconnect from previously connected shape
    if (shapeElementFound) {
      const shapeElementId: string | undefined =
        position === 'start'
          ? pathElement.connectedElementStart
          : pathElement.connectedElementEnd;

      const isConnectedElementChanges = connectToElementId !== shapeElementId;

      if (isConnectedElementChanges) {
        const shapePatch = connectShapeElement(shapeElement, pathElementId);
        patches.push({
          elementId: connectToElementId,
          patch: shapePatch,
        });

        const previousShapePatch = disconnectConnectedShapeFromLine(
          slideInstance,
          pathElementId,
          pathElement,
          position,
        );
        if (previousShapePatch) {
          patches.push(previousShapePatch);
        }
      }
    }
  }

  return patches;
}

/**
 * Provides an update to disconnect a connected shape (if exists) from
 * the line on specified position.
 * @param slideInstance slide instance to load a connected shape element
 * @param pathElementId path element id
 * @param pathElement path element
 * @param position start or end connection position
 * @return update to disconnect a connected shape from the line
 */
function disconnectConnectedShapeFromLine(
  slideInstance: WhiteboardSlideInstance,
  pathElementId: string,
  pathElement: PathElement,
  position: 'start' | 'end',
): ElementUpdate | undefined {
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

  let patch: ElementUpdate | undefined;

  if (shapeElementData) {
    const [shapeElementId, shapeElement] = shapeElementData;
    const shapePatch = disconnectShapeElement(shapeElement, [pathElementId]);
    if (shapePatch) {
      patch = {
        elementId: shapeElementId,
        patch: shapePatch,
      };
    }
  }

  return patch;
}

export function frameResizeUpdates(
  slideInstance: WhiteboardSlideInstance,
  resizeFrameElementId: string,
  resizeFrameElement: FrameElement,
  frameElementOverride: ElementOverride,
  elementFrameChanges: Record<string, ElementFrameChanges>,
): ElementUpdate[] {
  const updates: ElementUpdate[] = [];

  const frameElementsChanges = invertChangeElementFrame(elementFrameChanges);

  updates.push({
    elementId: resizeFrameElementId,
    patch: {
      ...frameElementOverride,
      ...(frameElementsChanges[resizeFrameElementId] &&
        attachFrameElements(
          resizeFrameElement,
          frameElementsChanges[resizeFrameElementId],
        )),
    },
  });

  for (const [frameId, changes] of Object.entries(frameElementsChanges)) {
    if (frameId === resizeFrameElementId) {
      continue;
    }

    const frameElement = slideInstance.getElement(frameId);
    if (!frameElement || frameElement.type !== 'frame') {
      continue;
    }

    const patch = attachFrameElements(frameElement, changes);
    if (!patch) {
      continue;
    }

    updates.push({
      elementId: frameId,
      patch,
    });
  }

  for (const [elementId, changes] of Object.entries(elementFrameChanges)) {
    const element = slideInstance.getElement(elementId);
    if (!element || element.type === 'frame') {
      continue;
    }

    const patch = attachElementFrame(element, changes.newFrameId);
    if (!patch) {
      continue;
    }

    updates.push({
      elementId,
      patch,
    });
  }

  return updates;
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
  changeElementFrame: Record<string, ElementFrameChanges>,
): ElementUpdate[] {
  const disconnectPathElementsObj = findPathElementsToDisconnect(
    elementOverrideUpdates,
    elements,
  );

  // Selected lines may become disconnected, apply disconnect patch
  // Selected elements may become attached/detached to frames
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
          ...(element.type !== 'frame' &&
            Object.keys(changeElementFrame).includes(elementId) &&
            attachElementFrame(
              element,
              changeElementFrame[elementId].newFrameId,
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

  const frameElementsChanges = invertChangeElementFrame(changeElementFrame);

  // Attach / detach elements to frame
  const framesUpdates: ElementUpdate[] = [];
  for (const [frameElementId, changes] of Object.entries(
    frameElementsChanges,
  )) {
    const frameElement = slideInstance.getElement(frameElementId);
    if (frameElement && frameElement.type === 'frame') {
      const patch = attachFrameElements(frameElement, changes);
      if (patch) {
        framesUpdates.push({
          elementId: frameElementId,
          patch,
        });
      }
    }
  }

  return [...elementsUpdates, ...shapesUpdates, ...framesUpdates];
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

export function findElementsToDetach(
  elementAttachFrame: Record<string, string>,
  elements: Elements,
): Record<string, string> {
  const elementFrame: Record<string, string> = {};

  for (const [elementId, element] of Object.entries(elements)) {
    if (
      element.type !== 'frame' &&
      element.attachedFrame &&
      element.attachedFrame !== elementAttachFrame[elementId]
    ) {
      elementFrame[elementId] = element.attachedFrame;
    }
  }

  return elementFrame;
}

export type ElementFrameChanges =
  | {
      oldFrameId?: string;
      newFrameId: string;
    }
  | {
      oldFrameId: string;
      newFrameId?: string;
    };

/**
 * Find changes to be applied to elements regarding change element attach to frame
 * @param elementAttachFrame current element to frame attach during/after the movement
 * @param elements elements moved
 */
export function findElementsToAttachChange(
  elementAttachFrame: Record<string, string>,
  elements: Elements,
): Record<string, ElementFrameChanges> {
  const elementFrame: Record<string, ElementFrameChanges> = {};

  for (const [elementId, element] of Object.entries(elements)) {
    if (
      element.type !== 'frame' &&
      element.attachedFrame !== elementAttachFrame[elementId]
    ) {
      elementFrame[elementId] = {
        oldFrameId: element.attachedFrame,
        newFrameId: elementAttachFrame[elementId],
      };
    }
  }

  return elementFrame;
}

export function invertChangeElementFrame(
  changeElementFrame: Record<string, ElementFrameChanges>,
): Record<string, FrameElementsChanges> {
  const changeFrameElementsObject: Record<string, FrameElementsChanges> = {};

  for (const [elementId, change] of Object.entries(changeElementFrame)) {
    const { oldFrameId, newFrameId } = change;
    if (oldFrameId && changeFrameElementsObject[oldFrameId] === undefined) {
      changeFrameElementsObject[oldFrameId] = {
        attachElementIds: [],
        detachElementIds: [],
      };
    }
    if (newFrameId && changeFrameElementsObject[newFrameId] === undefined) {
      changeFrameElementsObject[newFrameId] = {
        attachElementIds: [],
        detachElementIds: [],
      };
    }
    if (oldFrameId) {
      changeFrameElementsObject[oldFrameId].detachElementIds.push(elementId);
    }
    if (newFrameId) {
      changeFrameElementsObject[newFrameId].attachElementIds.push(elementId);
    }
  }

  return changeFrameElementsObject;
}

/**
 * Takes elements and frames and finds element to frame intersection via
 * bounding rectangles to be used as attach relation.
 * @param elements elements to check
 * @param frameElements frame elements
 * @returns element to frame intersection
 */
export function findElementAttachFrame(
  elements: Elements,
  frameElements: Elements<FrameElement>,
): Record<string, string> {
  const elementAttachFrame: Record<string, string> = {};

  for (const [elementId, element] of Object.entries(elements)) {
    if (element && element.type !== 'frame') {
      const frameElementId = findFrameToAttach(element, frameElements);
      if (frameElementId) {
        elementAttachFrame[elementId] = frameElementId;
      }
    }
  }

  return Object.fromEntries(
    Object.entries(elementAttachFrame).filter(([elementId, frameId]) => {
      const element = elements[elementId];
      if (element.type !== 'path') {
        return true;
      }

      const { connectedElementStart, connectedElementEnd } = element;
      return (
        (connectedElementStart === undefined ||
          elementAttachFrame[connectedElementStart] === frameId) &&
        (connectedElementEnd === undefined ||
          elementAttachFrame[connectedElementEnd] === frameId)
      );
    }),
  );
}

/**
 * Find elements that were moved by the frame movement.
 * @param elements elements
 * @returns elements moved because an attached frame is moved
 */
export function findAttachedElementsMovedByFrame(elements: Elements): string[] {
  const attachedElementsMovedByFrame: string[] = [];

  for (const [elementId, element] of Object.entries(elements)) {
    if (
      element &&
      element.type !== 'frame' &&
      element.attachedFrame !== undefined &&
      elements[element.attachedFrame] !== undefined
    ) {
      attachedElementsMovedByFrame.push(elementId);
    }
  }

  return attachedElementsMovedByFrame;
}

export function mergeElementsAndOverrides<T extends Element = Element>(
  elements: Elements<T>,
  overrides: Record<string, ElementOverride | undefined>,
): Elements<T> {
  return Object.fromEntries(
    Object.entries(elements).map(([elementId, element]) => [
      elementId,
      mergeElementAndOverride(element, overrides[elementId]),
    ]),
  );
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
