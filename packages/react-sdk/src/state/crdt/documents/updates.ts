/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { nanoid } from '@reduxjs/toolkit';
import { ChangeFn } from '../types';
import { SharedMap } from '../y';
import {
  calculateBoundingRectForElements,
  Element,
  FrameElement,
  positionElementsToWhiteboard,
} from './elements';
import {
  generateAddElement,
  getNormalizedSlideIds,
  getSlide,
} from './operations';
import { WhiteboardDocument } from './whiteboardDocument';
import {
  frameHeight,
  framesWhiteboardHeight,
  framesWhiteboardWidth,
  frameWidth,
  slidesWhiteboardHeight,
  slidesWhiteboardWidth,
} from './whiteboardDocumentConstants';

type ElementWithId<T> = {
  id: string;
  element: T;
};

export function generateFramesUpdate(
  sourceDoc: SharedMap<WhiteboardDocument>,
): ChangeFn<WhiteboardDocument> {
  return (doc: SharedMap<WhiteboardDocument>) => {
    const docSlideId = getNormalizedSlideIds(doc)[0];

    if (!docSlideId) {
      throw new Error(`Cannot get document slide id`);
    }

    const infiniteCanvasElements = getInfiniteCanvasElements(sourceDoc);
    if (infiniteCanvasElements) {
      // Add elements
      for (const [id, element] of Object.entries(infiniteCanvasElements)) {
        const [addElement] = generateAddElement(docSlideId, element, id);
        addElement(doc);
      }

      return;
    }

    const slideIds = getNormalizedSlideIds(sourceDoc);
    const firstSlideElements: ElementWithId<Element>[] = [];

    for (const slideId of slideIds) {
      const slide = getSlide(sourceDoc, slideId);

      if (!slide) {
        continue;
      }

      const frameElementId = nanoid();

      const elementIds: string[] = [];
      const newElements: ElementWithId<Element>[] = [];
      for (const [elementId, element] of slide.get('elements')) {
        const elementJson = element.toJSON();
        if (elementJson.type !== 'frame') {
          elementIds.push(elementId);
          newElements.push({
            id: elementId,
            element: {
              ...elementJson,
              attachedFrame: frameElementId,
            },
          });
        }
      }

      const frameElementJson: FrameElement = {
        type: 'frame',
        // frames will be positioned later
        position: {
          x: 0,
          y: 0,
        },
        width: frameWidth,
        height: frameHeight,
        attachedElements: elementIds,
      };

      firstSlideElements.push({
        id: frameElementId,
        element: frameElementJson,
      });
      firstSlideElements.push(...newElements);
    }

    const frameElements: ElementWithId<FrameElement>[] = [];
    for (const { id, element } of firstSlideElements) {
      if (element.type === 'frame') {
        frameElements.push({ id, element });
      }
    }

    const positionedFrameElements = positionElementsToWhiteboard(
      frameElements.map(({ id, element }) => ({ id, ...element })),
      framesWhiteboardWidth,
      framesWhiteboardHeight,
      framesWhiteboardWidth / 2,
      framesWhiteboardHeight / 2,
    );

    const positionedFramesMap: Map<string, FrameElement> = new Map<
      string,
      FrameElement
    >();
    for (const { id, ...frameElement } of positionedFrameElements) {
      positionedFramesMap.set(id, frameElement);
    }

    const positionedFirstSlideElements: ElementWithId<Element>[] = [];

    for (const { id, element } of firstSlideElements) {
      if (element.type === 'frame') {
        const frame = positionedFramesMap.get(id);
        if (frame) {
          positionedFirstSlideElements.push({ id, element: frame });
        }
      } else if (element.attachedFrame) {
        const frame = positionedFramesMap.get(element.attachedFrame);
        if (frame) {
          // position the element within its frame
          const newElement = {
            ...element,
            position: {
              x: element.position.x + frame.position.x,
              y: element.position.y + frame.position.y,
            },
          };
          positionedFirstSlideElements.push({ id, element: newElement });
        }
      }
    }

    // Add elements
    for (const { id, element } of positionedFirstSlideElements) {
      const [addElement] = generateAddElement(docSlideId, element, id);
      addElement(doc);
    }
  };
}

/**
 * Gets elements of whiteboard document if the document has a single slide and the slide is empty or contains any element within infinite canvas bounds.
 * @param doc a document to check
 * @returns all elements of infinite canvas whiteboard document or undefined
 */
export function getInfiniteCanvasElements(
  doc: SharedMap<WhiteboardDocument>,
): Record<string, Element> | undefined {
  const slideIds = getNormalizedSlideIds(doc);

  if (slideIds.length !== 1) {
    return undefined;
  }

  const slideId = slideIds[0];
  const slide = getSlide(doc, slideId);

  if (!slide) {
    return undefined;
  }

  const slideJson = slide.toJSON();

  const elements: Element[] = Object.values(slideJson.elements);
  if (elements.length === 0) {
    return slideJson.elements;
  }

  const { offsetX, offsetY, width, height } =
    calculateBoundingRectForElements(elements);
  const hasElementWithinInfiniteCanvas =
    offsetX + width >= slidesWhiteboardWidth &&
    offsetY + height >= slidesWhiteboardHeight;

  if (hasElementWithinInfiniteCanvas) {
    return slideJson.elements;
  } else {
    return undefined;
  }
}
