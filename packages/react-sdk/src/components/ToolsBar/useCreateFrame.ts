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

import { clamp } from 'lodash';
import { useCallback } from 'react';
import { filterRecord } from '../../lib';
import { FrameElement, useWhiteboardSlideInstance } from '../../state';
import {
  calculateIntersect,
  frameHeight,
  frameWidth,
  gridCellSize,
  whiteboardHeight,
  whiteboardWidth,
} from '../Whiteboard';
import { useSvgScaleContext } from '../Whiteboard/SvgScaleContext';

const frameGap = gridCellSize;

type UseCreateFrameResult = {
  /**
   * Add a frame to the board.
   *
   * The frame is placed centred on the current viewport, except there is already a frame.
   * In this case it is placed next to the existing frame.
   */
  createFrame: () => void;
};

export const useCreateFrame = (): UseCreateFrameResult => {
  const slideInstance = useWhiteboardSlideInstance();
  const { viewportCanvasCenter } = useSvgScaleContext();

  const createFrame = useCallback(() => {
    const maxX = whiteboardWidth - frameWidth;
    const maxY = whiteboardHeight - frameHeight;

    const position = {
      x: clamp(viewportCanvasCenter.x - frameWidth / 2, 0, maxX),
      y: clamp(viewportCanvasCenter.y - frameHeight / 2, 0, maxY),
    };

    const frameProps: FrameElement = {
      type: 'frame',
      position,
      width: frameWidth,
      height: frameHeight,
    };

    const allElements = slideInstance.getElements(
      slideInstance.getElementIds(),
    );
    const frameElements = filterRecord(allElements, (e) => e.type === 'frame');
    let lastFrameId = calculateIntersect(frameProps, frameElements).at(-1);

    // As long as there are intersecting frames and the end of canvas was not reached
    // shift the frame after the last intersecting frame.
    while (lastFrameId !== undefined) {
      const lastFrame = slideInstance.getElement(lastFrameId);

      if (lastFrame?.type !== 'frame') {
        console.warn('Frame by ID not found on the slide', lastFrameId);
        break;
      }

      // Set top left frame corner to be aligned with top right last intersecting frame corner
      const alignedPosition = {
        x: lastFrame.position.x + lastFrame.width + frameGap,
        y: lastFrame.position.y,
      };

      const clampedAlignedPosition = {
        x: clamp(alignedPosition.x, 0, maxX),
        y: clamp(alignedPosition.y, 0, maxY),
      };

      if (
        alignedPosition.x !== clampedAlignedPosition.x ||
        alignedPosition.y !== clampedAlignedPosition.y
      ) {
        // End of canvas reached; break loop
        frameProps.position = clampedAlignedPosition;
        break;
      }

      // Get intersecting frames again to be checked by the next loop.
      frameProps.position = alignedPosition;
      lastFrameId = calculateIntersect(frameProps, frameElements).at(-1);
    }

    slideInstance.addElement(frameProps);
  }, [slideInstance, viewportCanvasCenter]);

  return {
    createFrame,
  };
};
