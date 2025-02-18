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
import { Element, PathElement, ShapeElement } from './crdt';
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
): Pick<ShapeElement, 'connectedPaths'> | undefined {
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

export function deleteConnectionData(element: Element): Element {
  if (element.type === 'shape') {
    const { connectedPaths, ...newElement } = element;
    return newElement;
  } else if (element.type === 'path') {
    const { connectedElementStart, connectedElementEnd, ...newElement } =
      element;
    return newElement;
  } else {
    return element;
  }
}
