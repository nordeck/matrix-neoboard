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

import { isEqual, uniq } from 'lodash';
import {
  Element,
  FrameElement,
  ImageElement,
  PathElement,
  ShapeElement,
} from './crdt';
import { Elements } from './types';

/**
 * Within selected elements it finds not selected connecting paths.
 * @param elements selected elements
 */
export function findConnectingPaths(elements: Elements): string[] {
  const elementIds: string[] = [];

  for (const element of Object.values(elements)) {
    if (element.type === 'shape' && element.connectedPaths) {
      for (const pathElementId of element.connectedPaths) {
        if (!elements[pathElementId]) {
          elementIds.push(pathElementId);
        }
      }
    }
  }

  return uniq(elementIds);
}

/**
 * Within selected elements it finds not selected connecting shapes.
 * @param elements selected elements
 */
export function findConnectingShapes(elements: Elements): string[] {
  const elementIds: string[] = [];

  for (const element of Object.values(elements)) {
    if (element.type === 'path') {
      const connectedElements = [
        element.connectedElementStart,
        element.connectedElementEnd,
      ];
      for (const shapeElementId of connectedElements) {
        if (shapeElementId && !elements[shapeElementId]) {
          elementIds.push(shapeElementId);
        }
      }
    }
  }

  return uniq(elementIds);
}

/**
 * Return the ids of the active elements and the ids of the attached elements for each active element.
 * @param activeElementIds - active elements
 * @param frameElements - frame elements
 * @returns active and attached elements of each active element
 */
export function findActiveAndAttachedElementIds(
  activeElementIds: string[],
  frameElements: Elements<FrameElement>,
): string[] {
  return activeElementIds.flatMap((elementId) => {
    const frameElement: FrameElement | undefined = frameElements[elementId];
    if (
      frameElement &&
      frameElement.attachedElements &&
      frameElement.attachedElements.length > 0
    ) {
      return [
        elementId,
        ...frameElement.attachedElements.filter(
          (elementId) => !activeElementIds.includes(elementId),
        ),
      ];
    } else {
      return elementId;
    }
  });
}

/**
 * Find the elements that are attached to the frames within the passed selected elements but are not themselves selected.
 * @param elements - selected elements
 */
export function findNotSelectedAttachedElements(elements: Elements): string[] {
  const elementIds: string[] = [];

  for (const element of Object.values(elements)) {
    if (element.type === 'frame' && element.attachedElements) {
      for (const attachedElement of element.attachedElements) {
        if (!elements[attachedElement]) {
          // Attached element, not selected
          elementIds.push(attachedElement);
        }
      }
    }
  }

  return elementIds;
}

/**
 * Find attached elements to detach from frames when the passed elements are deleted.
 * @param elements - elements to be deleted
 */
export function findElementDetachFrame(
  elements: Elements,
): Record<string, string> {
  const elementDetachFrame: Record<string, string> = {};

  for (const [elementId, element] of Object.entries(elements)) {
    if (element.type !== 'frame' && element.attachedFrame) {
      const frameId = element.attachedFrame;
      if (!elements[frameId]) {
        /**
         * A non frame element is selected, its attached frame is not.
         * Saving the element to be detached from the frame.
         */
        elementDetachFrame[elementId] = frameId;
      }
    }
  }

  return elementDetachFrame;
}

export function invertElementAttachFrame(
  elementAttachFrame: Record<string, string>,
): Record<string, string[]> {
  const frameElements: Record<string, string[]> = {};

  for (const [elementId, frameElementId] of Object.entries(
    elementAttachFrame,
  )) {
    if (frameElements[frameElementId] === undefined) {
      frameElements[frameElementId] = [];
    }
    frameElements[frameElementId].push(elementId);
  }

  return frameElements;
}

export type FrameElementsChange = {
  attachElementIds: string[];
  detachElementIds: string[];
};

/**
 * Create a patch to attach and detach elements to a frame element
 */
export function changeFrameElements(
  { attachedElements }: FrameElement,
  { attachElementIds, detachElementIds }: FrameElementsChange,
): Pick<FrameElement, 'attachedElements'> | undefined {
  let newAttachedElements = attachedElements ? [...attachedElements] : [];
  let modified: boolean = false;

  for (const elementId of attachElementIds) {
    if (!newAttachedElements.includes(elementId)) {
      newAttachedElements.push(elementId);
      modified = true;
    }
  }

  if (
    detachElementIds.length > 0 &&
    newAttachedElements.some((elementId) =>
      detachElementIds.includes(elementId),
    )
  ) {
    modified = true;
    newAttachedElements = newAttachedElements.filter(
      (elementId) => !detachElementIds.includes(elementId),
    );
  }

  return modified
    ? {
        attachedElements:
          newAttachedElements.length !== 0 ? newAttachedElements : undefined,
      }
    : undefined;
}

/**
 * Create a patch to attach and detach a frame to an element
 */
export function changeElementFrame(
  { attachedFrame }: ShapeElement | PathElement | ImageElement,
  frameElementId: string | undefined,
): Pick<ShapeElement, 'attachedFrame'> | undefined {
  if (!frameElementId) {
    return attachedFrame ? { attachedFrame: undefined } : undefined;
  }

  return attachedFrame !== frameElementId
    ? {
        attachedFrame: frameElementId,
      }
    : undefined;
}

export function connectPathElement(
  { connectedElementStart, connectedElementEnd }: PathElement,
  position: 'start' | 'end',
  shapeElementId: string,
):
  | Pick<PathElement, 'connectedElementStart' | 'connectedElementEnd'>
  | undefined {
  if (position === 'start' && shapeElementId !== connectedElementStart) {
    return {
      connectedElementStart: shapeElementId,
    };
  }

  if (position === 'end' && shapeElementId !== connectedElementEnd) {
    return {
      connectedElementEnd: shapeElementId,
    };
  }

  return undefined;
}

export function connectShapeElement(
  { connectedPaths }: ShapeElement,
  pathElementId: string,
): Pick<ShapeElement, 'connectedPaths'> {
  return {
    connectedPaths: [...(connectedPaths ?? []), pathElementId],
  };
}

export function disconnectPathElementOnPosition(
  { connectedElementStart, connectedElementEnd }: PathElement,
  position: 'start' | 'end',
):
  | Pick<PathElement, 'connectedElementStart' | 'connectedElementEnd'>
  | undefined {
  if (position === 'start' && connectedElementStart !== undefined) {
    return {
      connectedElementStart: undefined,
    };
  }

  if (position === 'end' && connectedElementEnd !== undefined) {
    return {
      connectedElementEnd: undefined,
    };
  }

  return undefined;
}

/**
 * Create patch to disconnect path element from other elements.
 * @param pathElement path element
 * @param elementIds elements to disconnect or undefined it to disconnect all
 * @return patch with new connected elements or undefined if no changes needed
 */
export function disconnectPathElement(
  { connectedElementStart, connectedElementEnd }: PathElement,
  elementIds: string[] | undefined,
):
  | Pick<PathElement, 'connectedElementStart' | 'connectedElementEnd'>
  | undefined {
  if (!connectedElementStart && !connectedElementEnd) {
    return undefined;
  }

  if (!elementIds) {
    return {
      ...(connectedElementStart && {
        connectedElementStart: undefined,
      }),
      ...(connectedElementEnd && {
        connectedElementEnd: undefined,
      }),
    };
  }

  if (
    connectedElementStart &&
    !elementIds.includes(connectedElementStart) &&
    connectedElementEnd &&
    !elementIds.includes(connectedElementEnd)
  ) {
    return undefined;
  }

  return {
    ...(connectedElementStart &&
      elementIds.includes(connectedElementStart) && {
        connectedElementStart: undefined,
      }),
    ...(connectedElementEnd &&
      elementIds.includes(connectedElementEnd) && {
        connectedElementEnd: undefined,
      }),
  };
}

export function disconnectShapeElement(
  element: ShapeElement,
  elementIds: string[] | undefined,
  disconnectDuplicates: boolean = false,
): Pick<ShapeElement, 'connectedPaths'> | undefined {
  const connectedPaths = element.connectedPaths;
  if (!connectedPaths) {
    return undefined;
  }

  let newConnectedPaths: string[] | undefined;
  if (elementIds) {
    newConnectedPaths = [];
    const found: Set<string> = new Set<string>();
    for (let i = 0; i < connectedPaths.length; i++) {
      const connectedPath = connectedPaths[i];
      if (
        elementIds.includes(connectedPath) &&
        (disconnectDuplicates || !found.has(connectedPath))
      ) {
        found.add(connectedPath);
      } else {
        newConnectedPaths.push(connectedPath);
      }
    }

    if (newConnectedPaths.length == 0) {
      newConnectedPaths = undefined;
    }
  } else {
    newConnectedPaths = undefined;
  }

  if (isEqual(connectedPaths, newConnectedPaths)) {
    return undefined;
  } else {
    return {
      connectedPaths: newConnectedPaths,
    };
  }
}

/**
 * Deletes connection and attachment relations from the element
 * @param element element to delete relations
 * @returns a new element without relations
 */
export function deleteRelations(element: Element): Element {
  if (element.type === 'shape') {
    const { connectedPaths, attachedFrame, ...newElement } = element;
    return newElement;
  } else if (element.type === 'path') {
    const {
      connectedElementStart,
      connectedElementEnd,
      attachedFrame,
      ...newElement
    } = element;
    return newElement;
  } else if (element.type === 'frame') {
    const { attachedElements, ...newFrame } = element;
    return newFrame;
  } else if (element.type === 'image') {
    const { attachedFrame, ...newImage } = element;
    return newImage;
  } else {
    return element;
  }
}
