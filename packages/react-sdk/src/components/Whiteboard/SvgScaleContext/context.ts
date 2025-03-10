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

import { createContext, useContext } from 'react';
import { Point } from '../../../state';

export type Translation = { x: number; y: number };

export type ContainerDimensions = { width: number; height: number };

/**
 * This context provides data and functions to handle a scaled SVG element inside a container.
 */
export type SvgScaleContextType = {
  /**
   * Scale that is applied to the SVG
   */
  scale: number;
  /**
   * Set the scale that is applied to the SVG
   */
  setScale: (newScale: number, origin?: Point) => void;
  /**
   * Update the scale that is applied to the SVG
   *
   * @param scaleChange - value to add to the current scale
   * @param origin - optional scale origin, that should stay in the same place when scaling
   */
  updateScale: (scaleChange: number, origin?: Point) => void;

  /**
   * Translation that is applied to the SVG
   */
  translation: Translation;
  /**
   * Update the translation that is applied to the SVG
   *
   * @param changeX - X value to add to the current translation
   * @param changeY - Y value to add to the current translation
   */
  updateTranslation: (changeX: number, changeY: number) => void;

  /**
   * Recalculate values of the current canvas after container changes.
   */
  refreshCanvas: () => void;

  /**
   * Dimensions of the container holing the SVG
   */
  containerDimensions: ContainerDimensions;
  /**
   * Set the dimensions of the container holing the SVG
   */
  setContainerDimensions: (dimensions: ContainerDimensions) => void;

  /**
   * Transform a point from the SVG coordinate system to pixels on the container.
   */
  transformPointSvgToContainer: (point: Point) => Point;

  /**
   * Center point of the canvas on the current viewport.
   */
  viewportCanvasCenter: Point;
};

export const SvgScaleContext = createContext<SvgScaleContextType | undefined>(
  undefined,
);

export const useSvgScaleContext = (): SvgScaleContextType => {
  const context = useContext(SvgScaleContext);

  if (context === undefined) {
    throw new Error('useSvgScaleContext must be used within a SvgScaleContext');
  }

  return context;
};
