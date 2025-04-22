/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { createContext, useContext } from 'react';
import { Point } from '../../../state';

export type SvgCanvasContextType = {
  /**
   * With of the container holding the canvas
   *
   * @deprecated use SvgScaleContext.containerDimensions instead
   */
  width: number;
  /**
   * Height of the container holding the canvas
   *
   * @deprecated use SvgScaleContext.containerDimensions instead
   */
  height: number;
  /**
   * Canvas width
   *
   * @deprecated use whiteboard const whiteboardWidth instead
   */
  viewportWidth: number;
  /**
   * Canvas height
   *
   * @deprecated use whiteboard const whiteboardHeight instead
   */
  viewportHeight: number;

  calculateSvgCoords: (position: Point) => Point;
};

export const SvgCanvasContext = createContext<SvgCanvasContextType | undefined>(
  undefined,
);

export const useSvgCanvasContext = (): SvgCanvasContextType => {
  const context = useContext(SvgCanvasContext);

  if (context === undefined) {
    throw new Error('useSvgCanvasContext must be used within a SvgCanvas');
  }

  return context;
};

/**
 * Provides a custom instance of the `SvgCanvas` to the context.
 *
 * @remarks Should only be used in tests.
 */
export const SvgCanvasMockProvider = SvgCanvasContext.Provider;
