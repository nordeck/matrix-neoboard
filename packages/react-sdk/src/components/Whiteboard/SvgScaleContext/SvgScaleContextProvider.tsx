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
import React, {
  PropsWithChildren,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { Point } from '../../../state';
import {
  infiniteCanvasMode,
  whiteboardHeight,
  whiteboardWidth,
  zoomMax,
  zoomMin,
} from '../constants';
import { calculateScale } from '../SvgCanvas';
import {
  ContainerDimensions,
  SvgScaleContext,
  SvgScaleContextType,
  Translation,
} from './context';
import { applyOperation } from './utils';

type StateValues = {
  /**
   * Scale that is applied to the SVG
   */
  scale: number;

  /**
   * Translation that is applied to the SVG
   */
  translation: Translation;
};

function fitTranslation(
  state: StateValues,
  containerDimensions: ContainerDimensions,
): Translation {
  const clampX =
    (whiteboardWidth / 2) * state.scale - containerDimensions.width / 2;
  const clampY =
    (whiteboardHeight / 2) * state.scale - containerDimensions.height / 2;

  return {
    x: clamp(state.translation.x, -clampX, clampX),
    y: clamp(state.translation.y, -clampY, clampY),
  };
}

function fitScale(
  scale: number,
  containerDimensions: ContainerDimensions,
): number {
  const minScaleX = containerDimensions.width / whiteboardWidth;
  const minScaleY = containerDimensions.height / whiteboardHeight;
  return Math.max(scale, minScaleX, minScaleY);
}

export const SvgScaleContextProvider: React.FC<PropsWithChildren> = ({
  children,
}) => {
  const [stateValues, setStateValues] = useState<StateValues>({
    scale: 1,
    translation: {
      x: 0,
      y: 0,
    },
  });

  const [containerDimensions, setContainerDimensionsState] =
    useState<ContainerDimensions>({ width: 0, height: 0 });

  const updateStateValues = useCallback(
    (
      fun: (old: StateValues) => StateValues,
      dimensions: ContainerDimensions,
    ) => {
      setStateValues((old) => {
        const newState = fun(old);

        const fittedNewState: StateValues = {
          scale: newState.scale,
          translation: fitTranslation(newState, dimensions),
        };

        if (!isEqual(fittedNewState, old)) {
          return fittedNewState;
        }

        return old;
      });
    },
    [],
  );

  const updateScale = useCallback(
    (value: number, operation: 'set' | 'add', origin: Point) => {
      updateStateValues((old) => {
        let newScale = applyOperation(old.scale, value, operation);
        newScale = fitScale(newScale, containerDimensions);

        // Limit zoom levels
        if (newScale > zoomMax) {
          newScale = zoomMax;
        } else if (newScale <= zoomMin) {
          newScale = zoomMin;
        }

        // Origin needs to be translated to the canvas origin, which is center
        const translatedOriginX = origin.x - whiteboardWidth / 2;
        const translatedOriginY = origin.y - whiteboardHeight / 2;

        // Calculate offset to keep the origin at the same point on the viewport after scale
        const scaleChange = newScale - old.scale;
        const offsetX = -(translatedOriginX * scaleChange);
        const offsetY = -(translatedOriginY * scaleChange);

        const newTranslation = {
          x: old.translation.x + offsetX,
          y: old.translation.y + offsetY,
        };

        return {
          scale: newScale,
          translation: newTranslation,
        };
      }, containerDimensions);
    },
    [containerDimensions, updateStateValues],
  );

  const setContainerDimensions = useCallback(
    (dimensions: ContainerDimensions) => {
      if (isEqual(dimensions, containerDimensions)) {
        return;
      }

      setContainerDimensionsState(dimensions);

      if (infiniteCanvasMode) {
        updateStateValues((old) => old, dimensions);
      } else {
        setStateValues((old) => {
          const newState: StateValues = {
            scale: calculateScale(
              dimensions.width,
              dimensions.height,
              whiteboardWidth,
              whiteboardHeight,
            ),
            translation: old.translation,
          };

          if (!isEqual(newState, old)) {
            return newState;
          }

          return old;
        });
      }
    },
    [containerDimensions, updateStateValues],
  );

  const updateTranslation = useCallback(
    (changeX: number, changeY: number) => {
      updateStateValues(
        (old) => ({
          scale: old.scale,
          translation: {
            x: old.translation.x + changeX,
            y: old.translation.y + changeY,
          },
        }),
        containerDimensions,
      );
    },
    [containerDimensions, updateStateValues],
  );

  const transformPointSvgToContainer = useCallback(
    (point: { x: number; y: number }) => {
      return {
        x:
          (point.x - whiteboardWidth / 2) * stateValues.scale +
          containerDimensions.width / 2 +
          stateValues.translation.x,
        y:
          (point.y - whiteboardHeight / 2) * stateValues.scale +
          containerDimensions.height / 2 +
          stateValues.translation.y,
      };
    },
    [
      stateValues.scale,
      stateValues.translation.x,
      stateValues.translation.y,
      containerDimensions.width,
      containerDimensions.height,
    ],
  );

  const viewportCanvasCenter = useMemo(() => {
    const x =
      whiteboardWidth / 2 - stateValues.translation.x / stateValues.scale;
    const y =
      whiteboardHeight / 2 - stateValues.translation.y / stateValues.scale;

    return {
      x,
      y,
    };
  }, [stateValues]);

  const moveToPositionAndScale = useCallback(
    (position: Point, scale: number) => {
      const translationX = (whiteboardWidth / 2 - position.x) * scale;
      const translationY = (whiteboardHeight / 2 - position.y) * scale;

      const stateValues = {
        scale,
        translation: {
          x: translationX,
          y: translationY,
        },
      };
      updateStateValues(() => stateValues, containerDimensions);
    },
    [containerDimensions, updateStateValues],
  );

  const state: SvgScaleContextType = useMemo(() => {
    return {
      scale: stateValues.scale,
      updateScale,
      translation: stateValues.translation,
      updateTranslation,
      moveToPositionAndScale,
      containerDimensions,
      setContainerDimensions,
      transformPointSvgToContainer,
      viewportCanvasCenter,
    };
  }, [
    containerDimensions,
    setContainerDimensions,
    stateValues.scale,
    stateValues.translation,
    transformPointSvgToContainer,
    updateScale,
    moveToPositionAndScale,
    updateTranslation,
    viewportCanvasCenter,
  ]);

  return (
    <SvgScaleContext.Provider value={state}>
      {children}
    </SvgScaleContext.Provider>
  );
};
