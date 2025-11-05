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

import { nanoid } from '@reduxjs/toolkit';
import {
  frameHeight,
  frameWidth,
  whiteboardHeight,
  whiteboardWidth,
} from '../../components/Whiteboard';
import { positionElementsToWhiteboard } from '../crdt';
import {
  ElementExport,
  FrameElementExport,
  WhiteboardDocumentExport,
} from '../export';

/**
 * Transform the multiple slides of the whiteboard document into a single slide with multiple frames.
 * @param data whiteboard document export
 */
export function transformSlidesToFrames(
  data: WhiteboardDocumentExport,
): WhiteboardDocumentExport {
  const {
    version,
    whiteboard: { slides, files },
  } = data;

  if (slides.length < 2) {
    return data;
  }

  const firstSlideElements: ElementExport[] = [];

  for (let slideIndex = 0; slideIndex < slides.length; slideIndex++) {
    const slide = slides[slideIndex];

    const frameElementId = nanoid();

    const elementIds: string[] = [];
    const newElements: ElementExport[] = [];
    for (const element of slide.elements) {
      const { id: elementId } = element;
      const newElementId = elementId ?? nanoid();
      if (element.type !== 'frame') {
        elementIds.push(newElementId);
        newElements.push({
          ...element,
          id: newElementId,
          attachedFrame: frameElementId,
        });
      }
    }

    const frameElement: FrameElementExport = {
      id: frameElementId,
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

    firstSlideElements.push(frameElement);
    firstSlideElements.push(...newElements);
  }

  const frameElements: FrameElementExport[] = [];
  for (const element of firstSlideElements) {
    if (element.type === 'frame') {
      frameElements.push(element);
    }
  }

  const positionedFrameElements = positionElementsToWhiteboard(
    frameElements,
    whiteboardWidth,
    whiteboardHeight,
    whiteboardWidth / 2,
    whiteboardHeight / 2,
  );

  const positionedFramesMap: Map<string, FrameElementExport> = new Map<
    string,
    FrameElementExport
  >();
  for (const frameElement of positionedFrameElements) {
    if (frameElement.id) {
      positionedFramesMap.set(frameElement.id, frameElement);
    }
  }

  const positionedFirstSlideElements: ElementExport[] = [];
  for (const element of firstSlideElements) {
    if (element.type === 'frame') {
      if (element.id) {
        const frame = positionedFramesMap.get(element.id);
        if (frame) {
          positionedFirstSlideElements.push(frame);
        }
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
        positionedFirstSlideElements.push(newElement);
      }
    }
  }

  return {
    version,
    whiteboard: {
      slides: [
        {
          elements: positionedFirstSlideElements,
        },
      ],
      files,
    },
  };
}
