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

import { clamp, isEqual } from 'lodash';
import { PropsWithChildren, useCallback, useMemo, useState } from 'react';
import { Point } from '../../../state';
import {
  infiniteCanvasMode,
  whiteboardHeight,
  whiteboardWidth,
  zoomMax,
  zoomMin,
} from '../constants';
import {
  ContainerDimensions,
  SvgScaleContext,
  SvgScaleContextType,
} from './context';

type SvgScaleContextValues = Pick<SvgScaleContextType, 'scale' | 'translation'>;

const fitFunc = (
  state: SvgScaleContextValues,
  containerDimensions: ContainerDimensions,
): SvgScaleContextValues => {
  if (!infiniteCanvasMode) {
    // Fit canvas into container

    const containerHasPortraitRatio =
      containerDimensions.width / containerDimensions.height >
      whiteboardWidth / whiteboardHeight;

    if (containerHasPortraitRatio) {
      // Fit height
      const scale = containerDimensions.height / whiteboardHeight;

      return {
        ...state,
        scale,
        translation: {
          x: containerDimensions.width / 2,
          y: containerDimensions.height / 2,
        },
      };
    }

    // Fit width
    return {
      ...state,
      scale: containerDimensions.width / whiteboardWidth,
      translation: {
        x: containerDimensions.width / 2,
        y: containerDimensions.height / 2,
      },
    };
  }

  const minScaleX = containerDimensions.width / whiteboardWidth;
  const minScaleY = containerDimensions.height / whiteboardHeight;
  const fittedScale = Math.max(state.scale, minScaleX, minScaleY);

  const clampXStart = (whiteboardWidth / 2) * fittedScale;
  const clampXEnd =
    containerDimensions.width - (whiteboardWidth / 2) * fittedScale;
  const clampYStart = (whiteboardHeight / 2) * fittedScale;
  const clampYEnd =
    containerDimensions.height - (whiteboardHeight / 2) * fittedScale;

  return {
    ...state,
    scale: fittedScale,
    translation: {
      x: clamp(state.translation.x, clampXEnd, clampXStart),
      y: clamp(state.translation.y, clampYEnd, clampYStart),
    },
  };
};

export const SvgScaleContextProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [stateValues, setStateValues] = useState({
    scale: 1,
    translation: {
      x: 0,
      y: 0,
    },
  });

  const [containerDimensions, setContainerDimensionsState] =
    // Start with something not 0
    useState<ContainerDimensions>({ width: 1920, height: 1080 });

  const setScale = useCallback(
    (newScale: number, origin?: Point) => {
      // Limit zoom levels
      if (newScale > zoomMax) {
        newScale = zoomMax;
      } else if (newScale <= zoomMin) {
        newScale = zoomMin;
      }

      const newState = {
        ...stateValues,
        scale: newScale,
      };

      if (origin !== undefined) {
        // Origin needs to be translated to the canvas origin, which is centre
        const translatedOriginX = origin.x - whiteboardWidth / 2;
        const translatedOriginY = origin.y - whiteboardHeight / 2;

        // Calculate offset to keep the origin at the same point on the viewport after scale
        const scaleChange = newScale - stateValues.scale;
        const offsetX = -(translatedOriginX * scaleChange);
        const offsetY = -(translatedOriginY * scaleChange);

        newState.translation = {
          x: stateValues.translation.x + offsetX,
          y: stateValues.translation.y + offsetY,
        };
      }

      const fittedState = fitFunc(newState, containerDimensions);

      if (!isEqual(fittedState, stateValues)) {
        setStateValues(fittedState);
      }
    },
    [containerDimensions, stateValues],
  );

  const updateScale = useCallback(
    (scaleChange: number, origin?: Point) => {
      const newScale = stateValues.scale + scaleChange;
      setScale(newScale, origin);
    },
    [setScale, stateValues.scale],
  );

  const setContainerDimensions = useCallback(
    (dimensions: ContainerDimensions) => {
      if (!isEqual(dimensions, containerDimensions)) {
        setContainerDimensionsState(dimensions);
      }

      // Update state directly after setting the container dimensions to prevent an extra effect run.
      // This happens outside of the if block, e.g. for handling initial set of the container dimensions.
      const fittedState = fitFunc(stateValues, dimensions);

      if (!isEqual(fittedState, stateValues)) {
        setStateValues(fittedState);
      }
    },
    [containerDimensions, stateValues],
  );

  const updateTranslation = useCallback(
    (changeX: number, changeY: number) => {
      const newState = {
        ...stateValues,
        translation: {
          x: stateValues.translation.x + changeX,
          y: stateValues.translation.y + changeY,
        },
      };

      const fittedState = fitFunc(newState, containerDimensions);

      if (!isEqual(fittedState, stateValues)) {
        setStateValues(fittedState);
      }
    },
    [containerDimensions, stateValues],
  );

  const transformPointSvgToContainer = useCallback(
    (point: { x: number; y: number }) => {
      const matrix = new DOMMatrix();
      matrix.translateSelf(
        stateValues.translation.x,
        stateValues.translation.y,
      );
      matrix.scaleSelf(
        stateValues.scale,
        stateValues.scale,
        undefined,
        whiteboardWidth / 2,
        whiteboardHeight / 2,
      );
      const elementOnDiv = matrix.transformPoint(point);
      return elementOnDiv;
    },
    [stateValues.scale, stateValues.translation.x, stateValues.translation.y],
  );

  const state: SvgScaleContextType = useMemo(() => {
    return {
      scale: stateValues.scale,
      setScale,
      updateScale,
      translation: stateValues.translation,
      updateTranslation,
      containerDimensions,
      setContainerDimensions,
      transformPointSvgToContainer,
    };
  }, [
    containerDimensions,
    setContainerDimensions,
    setScale,
    stateValues.scale,
    stateValues.translation,
    transformPointSvgToContainer,
    updateScale,
    updateTranslation,
  ]);

  return (
    <SvgScaleContext.Provider value={state}>
      {children}
    </SvgScaleContext.Provider>
  );
};
