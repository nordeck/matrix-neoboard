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

import { ElementBase, Point } from '../../../state';
import { ContainerDimensions } from './context';

/**
 * Calculate position and scale to show element within container.
 * @param element element for calculation
 * @param containerDimensions container dimensions
 * @param scaleModifier modifies the scale when further scaling to element needed, defaults to 1
 */
export function calculatePositionAndScaleForElement(
  element: ElementBase & { width: number; height: number },
  containerDimensions: ContainerDimensions,
  scaleModifier: number = 1,
): {
  position: Point;
  scale: number;
} {
  const {
    position: { x, y },
    width: elementWidth,
    height: elementHeight,
  } = element;
  const { width: containerWidth, height: containerHeight } =
    containerDimensions;

  const position: Point = {
    x: x + elementWidth / 2,
    y: y + elementHeight / 2,
  };
  const scale = Math.min(
    (containerWidth / elementWidth) * scaleModifier,
    (containerHeight / elementHeight) * scaleModifier,
  );

  return {
    position,
    scale,
  };
}
