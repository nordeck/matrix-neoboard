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

import { useState } from 'react';
import { useUnmount } from 'react-use';
import {
  calculateBoundingRectForElements,
  ElementBase,
  ImageElement,
  ShapeElement,
  useWhiteboardSlideInstance,
} from '../../../../state';
import { isRotateableElement } from '../../../../state/crdt/documents/elements';
import {
  createResetElementOverrides,
  ElementOverrideUpdate,
  useElementOverrides,
  useSetElementOverride,
} from '../../../ElementOverridesProvider';
import { useLayoutState } from '../../../Layout';
import { useSvgCanvasContext } from '../../SvgCanvas';
import { elementsUpdates } from '../utils';
import { RotateHandler } from './RotateHandler';

export type DragEvent = {
  newAngle: number;
  lockAspectRatio: boolean;
};

export type RotateElementProps = {
  elementId: string;
};

export type Rotation = {
  angle: number;
};

export type RotateProperties = Rotation & {
  element: ElementBase;
};

export function RotateElement({ elementId }: RotateElementProps) {
  const setElementOverride = useSetElementOverride();
  const elements = useElementOverrides([elementId]);
  const activeElements = Object.values(elements);
  const { viewportWidth, viewportHeight } = useSvgCanvasContext();
  const [elementOverrideUpdates, setElementOverrideUpdates] = useState<
    ElementOverrideUpdate[]
  >([]);

  const boundingRect = calculateBoundingRectForElements(activeElements);
  const slideInstance = useWhiteboardSlideInstance();

  const containerHeight = boundingRect.height;
  const containerWidth = boundingRect.width;
  const offsetX = boundingRect.offsetX;
  const offsetY = boundingRect.offsetY;

  const { isRotating, setIsRotating } = useLayoutState();

  useUnmount(() => {
    setElementOverride(createResetElementOverrides([elementId]));
  });

  const handleDrag = (event: DragEvent) => {
    const update: ElementOverrideUpdate = {
      elementId,
      elementOverride: {
        rotation: event.newAngle,
      },
    };

    const updates = [update];

    setElementOverride(updates);
    setElementOverrideUpdates(updates);
  };

  const activeElement = activeElements[0] as ShapeElement | ImageElement;

  const handleDragStart = () => {
    if (!isRotateableElement(activeElement)) return;
    setIsRotating(true);
  };

  const handleDragStop = () => {
    const updates = elementsUpdates(
      slideInstance,
      elements,
      elementOverrideUpdates,
      {},
    );
    slideInstance.updateElements(updates);

    setElementOverride(undefined);
    setIsRotating(false);
  };

  if (!(activeElements.length === 1)) return null;
  if (!isRotateableElement(activeElement)) return null;

  return (
    <g
      data-testid="rotate-element"
      transform={`translate(${offsetX} ${offsetY})`}
    >
      <RotateHandler
        handlePosition={{
          containerWidth,
          containerHeight,
          offsetX,
          offsetY,
          rotation: activeElement.rotation ?? 0,
        }}
        onDrag={handleDrag}
        onDragStart={handleDragStart}
        onDragStop={handleDragStop}
      ></RotateHandler>

      {/* Helps to show the "grabbing" cursor everywhere */}
      {isRotating && (
        <rect
          id="rotate-handle-grab-thing"
          data-testid={`rotate-handle-grab-thing`}
          cursor={'grabbing'}
          fill="transparent"
          height={viewportHeight}
          transform={`translate(${-offsetX} ${-offsetY})`}
          width={viewportWidth}
        />
      )}
    </g>
  );
}
