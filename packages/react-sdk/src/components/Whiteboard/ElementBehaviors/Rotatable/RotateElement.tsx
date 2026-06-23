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

import { useCallback, useState } from 'react';
import { useUnmount } from 'react-use';
import {
  findConnectingPaths,
  isRotatableElement,
  useWhiteboardSlideInstance,
} from '../../../../state';
import {
  createResetElementOverrides,
  ElementOverrideUpdate,
  useElementOverrides,
  useSetElementOverride,
} from '../../../ElementOverridesProvider';
import { useLayoutState } from '../../../Layout';
import { whiteboardHeight, whiteboardWidth } from '../../constants';
import { elementsUpdates, getPathElements } from '../utils';
import { RotateHandle, RotateHandleDragEvent } from './RotateHandle';
import { rotateConnectedPaths } from './utils';

type RotateElementProps = {
  elementId: string;
};

export function RotateElement({ elementId }: RotateElementProps) {
  const setElementOverride = useSetElementOverride();
  const elements = useElementOverrides([elementId]);
  const [elementOverrideUpdates, setElementOverrideUpdates] = useState<
    ElementOverrideUpdate[]
  >([]);
  const slideInstance = useWhiteboardSlideInstance();
  const { isRotating, setIsRotating } = useLayoutState();

  useUnmount(() => {
    setElementOverride(createResetElementOverrides([elementId]));
  });

  const handleDrag = useCallback(
    (event: RotateHandleDragEvent) => {
      const update: ElementOverrideUpdate = {
        elementId,
        elementOverride: {
          rotation: event.newAngle,
        },
      };

      const updates = [update];

      const connectingPathElements = getPathElements(
        slideInstance,
        findConnectingPaths(elements),
      );

      // update the connected arrows
      updates.push(
        ...rotateConnectedPaths(event, connectingPathElements, elements),
      );

      setElementOverride(updates);
      setElementOverrideUpdates(updates);
    },
    [elementId, elements, setElementOverride, slideInstance],
  );

  const handleDragStart = useCallback(() => {
    setIsRotating(true);
  }, [setIsRotating]);

  const handleDragStop = useCallback(() => {
    const updates = elementsUpdates(
      slideInstance,
      elements,
      elementOverrideUpdates,
      {},
    );
    slideInstance.updateElements(updates);

    setElementOverride(undefined);
    setIsRotating(false);
  }, [
    slideInstance,
    elements,
    elementOverrideUpdates,
    setElementOverride,
    setIsRotating,
  ]);

  const element = elements[elementId];
  if (!isRotatableElement(element)) return null;

  const {
    position: { x: offsetX, y: offsetY },
    width,
    height,
    rotation,
  } = element;

  return (
    <g
      data-testid="rotate-element"
      transform={`translate(${offsetX} ${offsetY})`}
    >
      <RotateHandle
        handlePosition={{
          offsetX,
          offsetY,
          containerWidth: width,
          containerHeight: height,
          rotation: rotation ?? 0,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
      />

      {/* Helps to show the "grabbing" cursor everywhere */}
      {isRotating && (
        <rect
          data-testid="rotate-handle-grab"
          cursor="grabbing"
          fill="transparent"
          height={whiteboardHeight}
          transform={`translate(${-offsetX} ${-offsetY})`}
          width={whiteboardWidth}
        />
      )}
    </g>
  );
}
