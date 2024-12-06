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
import { CanvasState, selectCombinedScale } from '../store/canvasSlice';
import { useAppSelector } from '../store/reduxToolkitHooks';

export const useScaledValue = (value: number) => {
  const scale = useAppSelector(selectCombinedScale);
  return value * scale;
};

export const useInvertedScaledValue = (value: number) => {
  const scale = useAppSelector(selectCombinedScale);
  return value / scale;
};

export const transformedPointSvgToDiv = (
  canvas: CanvasState,
  point: { x: number; y: number },
) => {
  const matrix = new DOMMatrix();
  matrix.translateSelf(canvas.translate.x, canvas.translate.y);
  matrix.scaleSelf(
    canvas.scale,
    canvas.scale,
    undefined,
    whiteboardWidth / 2,
    whiteboardHeight / 2,
  );
  const elementOnDiv = matrix.transformPoint(point);
  return elementOnDiv;
};
