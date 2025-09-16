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
  changeElementFrame,
  changeFrameElements,
  connectPathElement,
  connectShapeElement,
  disconnectPathElement,
  disconnectPathElementOnPosition,
  disconnectShapeElement,
  Element,
  ElementFrameChange,
  Elements,
  ElementUpdate,
  findFrameToAttach,
  FrameElement,
  invertChangeElementFrame,
  PathElement,
  ShapeElement,
  WhiteboardSlideInstance,
} from '../../../state';
import {
  ElementOverride,
  ElementOverrideUpdate,
  mergeElementAndOverride,
} from '../../ElementOverridesProvider';

/**
 * Provide updates to the resized line, including its element position, points, and its connection or disconnection to a shape or attachment to a frame.
 * Provide updates to the shapes regarding being connected/disconnected to the resized line.
 * Provide updates to the frame regarding being attached/detached.
 *
 * @param slideInstance slide instance
 * @param pathElementId path element id
 * @param pathElement path element (currently line only)
 * @param position start or end connection position of the line resized
 * @param connectToElementId if defined a shape element id to connect to, otherwise line to be disconnected on position if connection exists
 * @param attachToFrameId if defined a frame element id to attach to, otherwise line to be detached if attached
 * @return line element position, points updates, connection start and end updates, elements to connect/disconnect updates
 */
export function lineResizeUpdates(
  slideInstance: WhiteboardSlideInstance,
  pathElementId: string,
  pathElement: PathElement,
  position: 'start' | 'end',
  connectToElementId: string | undefined,
  attachToFrameId: string | undefined,
): ElementUpdate[] {
  const patches: ElementUpdate[] = [];
  const frameElements = slideInstance.getFrameElements();
  const frameElement: FrameElement | undefined = attachToFrameId
    ? frameElements[attachToFrameId]
    : undefined;

  if (!connectToElementId) {
    // Provides update with position, points, shape disconnect to a line
    patches.push({
      elementId: pathElementId,
      patch: {
        position: pathElement.position,
        points: pathElement.points,
        ...disconnectPathElementOnPosition(pathElement, position),
        ...changeElementFrame(pathElement, attachToFrameId),
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
        ...changeElementFrame(pathElement, attachToFrameId),
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

  if (attachToFrameId && frameElement) {
    // Provides update to attach path element to the frame
    const patch = changeFrameElements(frameElement, {
      attachElementIds: [pathElementId],
      detachElementIds: [],
    });
    if (patch) {
      patches.push({
        elementId: attachToFrameId,
        patch,
      });
    }
  } else if (!attachToFrameId && pathElement.attachedFrame) {
    // Provides update to detach attached path element from the frame
    const attachedFrameElement: FrameElement | undefined =
      frameElements[pathElement.attachedFrame];
    if (attachedFrameElement) {
      const patch = changeFrameElements(attachedFrameElement, {
        attachElementIds: [],
        detachElementIds: [pathElementId],
      });
      if (patch) {
        patches.push({
          elementId: pathElement.attachedFrame,
          patch,
        });
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

/**
 * Provide updates for the resized frame.
 * @param slideInstance slide instance
 * @param resizeFrameElementId frame id
 * @param resizeFrameElement frame element
 * @param frameElementOverride frame element override
 * @param elementFrameChanges element to frame change due to frame resize
 * @returns updates to resize frame and other elements attachment
 */
export function frameResizeUpdates(
  slideInstance: WhiteboardSlideInstance,
  resizeFrameElementId: string,
  resizeFrameElement: FrameElement,
  frameElementOverride: ElementOverride,
  elementFrameChanges: Record<string, ElementFrameChange>,
): ElementUpdate[] {
  const updates: ElementUpdate[] = [];

  const frameElementsChanges = invertChangeElementFrame(elementFrameChanges);

  updates.push({
    elementId: resizeFrameElementId,
    patch: {
      ...frameElementOverride,
      ...(frameElementsChanges[resizeFrameElementId] &&
        changeFrameElements(
          resizeFrameElement,
          frameElementsChanges[resizeFrameElementId],
        )),
    },
  });

  for (const [elementId, changes] of Object.entries(elementFrameChanges)) {
    const element = slideInstance.getElement(elementId);
    if (!element || element.type === 'frame') {
      continue;
    }

    const patch = changeElementFrame(element, changes.newFrameId);
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
 * @param elementFrameChanges elements to frames attach/detach changes
 * @return elements updates
 */
export function elementsUpdates(
  slideInstance: WhiteboardSlideInstance,
  elements: Elements,
  elementOverrideUpdates: ElementOverrideUpdate[],
  elementFrameChanges: Record<string, ElementFrameChange>,
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
            Object.keys(elementFrameChanges).includes(elementId) &&
            changeElementFrame(
              element,
              elementFrameChanges[elementId].newFrameId,
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

  const frameElementsChanges = invertChangeElementFrame(elementFrameChanges);

  // Attach / detach elements to frame
  const framesUpdates: ElementUpdate[] = [];
  for (const [frameElementId, changes] of Object.entries(
    frameElementsChanges,
  )) {
    const frameElement = slideInstance.getElement(frameElementId);
    if (frameElement && frameElement.type === 'frame') {
      const patch = changeFrameElements(frameElement, changes);
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

/**
 * Find changes to be applied to elements regarding attaching to frame.
 * @param elementAttachFrame element to frame attachment
 * @param elements current elements
 */
export function findElementFrameChanges(
  elementAttachFrame: Record<string, string>,
  elements: Elements,
): Record<string, ElementFrameChange> {
  const elementFrameChanges: Record<string, ElementFrameChange> = {};

  for (const [elementId, element] of Object.entries(elements)) {
    if (
      element.type !== 'frame' &&
      element.attachedFrame !== elementAttachFrame[elementId]
    ) {
      elementFrameChanges[elementId] = {
        oldFrameId: element.attachedFrame,
        newFrameId: elementAttachFrame[elementId],
      };
    }
  }

  return elementFrameChanges;
}

/**
 * Take elements and frames and find the element to frame intersection via bounding rectangles.
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

      if (!element) {
        return false;
      }

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
 * Find elements that were moved because the attached frame moved.
 * @param elements active, attached, connecting paths elements
 * @returns elements that moved because the attached frame moved
 */
export function findAttachedElementsMovedByFrame(elements: Elements): string[] {
  const movedElements: string[] = [];

  for (const [elementId, element] of Object.entries(elements)) {
    if (
      element &&
      element.type !== 'frame' &&
      element.attachedFrame !== undefined &&
      elements[element.attachedFrame] !== undefined
    ) {
      movedElements.push(elementId);
    }
  }

  return movedElements;
}

/**
 * Merge elements with overrides.
 * @param elements - elements to apply the overrides
 * @param overrides - overrides
 * @returns elements with merged overrides
 */
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
