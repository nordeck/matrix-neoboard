/*
 * Copyright 2024 Nordeck IT + Consulting GmbH
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

import { whiteboardHeight, whiteboardWidth } from '../components/Whiteboard';
import { useSvgScaleContext } from '../components/Whiteboard/SvgScaleContext';
import { SvgScaleContextType } from '../components/Whiteboard/SvgScaleContext/context';

/**
 * Scale a value from outside to the canvas.
 */
export const useScaleDivToSvg = (value: number) => {
  const { scale } = useSvgScaleContext();
  return value / scale;
};

export const transformedPointSvgToDiv = (
  svtScaleContextValues: SvgScaleContextType,
  point: { x: number; y: number },
) => {
  const matrix = new DOMMatrix();
  matrix.translateSelf(
    svtScaleContextValues.translation.x,
    svtScaleContextValues.translation.y,
  );
  matrix.scaleSelf(
    svtScaleContextValues.scale,
    svtScaleContextValues.scale,
    undefined,
    whiteboardWidth / 2,
    whiteboardHeight / 2,
  );
  const elementOnDiv = matrix.transformPoint(point);
  return elementOnDiv;
};
