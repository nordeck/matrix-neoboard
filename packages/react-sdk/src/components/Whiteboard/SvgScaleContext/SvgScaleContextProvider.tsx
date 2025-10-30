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
  useRef,
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
import {
  ContainerDimensions,
  SvgScaleContext,
  SvgScaleContextType,
  Translation,
} from './context';

type SvgScaleContextValues = Pick<SvgScaleContextType, 'scale' | 'translation'>;

function fitFunc(
  state: SvgScaleContextValues,
  containerDimensions: ContainerDimensions,
): SvgScaleContextValues {
  if (!infiniteCanvasMode) {
    // Fit canvas into container

    const containerHasPortraitRatio =
      containerDimensions.width / containerDimensions.height >
      whiteboardWidth / whiteboardHeight;

    if (containerHasPortraitRatio) {
      // Fit height
      const scale = containerDimensions.height / whiteboardHeight;

      return {
        scale,
        translation: {
          x: containerDimensions.width / 2,
          y: containerDimensions.height / 2,
        },
      };
    }

    // Fit width
    return {
      scale: containerDimensions.width / whiteboardWidth,
      translation: {
        x: containerDimensions.width / 2,
        y: containerDimensions.height / 2,
      },
    };
  }

  const fittedScale = fitScale(state.scale, containerDimensions);

  const clampX =
    (whiteboardWidth / 2) * fittedScale - containerDimensions.width / 2;
  const clampY =
    (whiteboardHeight / 2) * fittedScale - containerDimensions.height / 2;

  return {
    scale: fittedScale,
    translation: {
      x: clamp(state.translation.x, -clampX, clampX),
      y: clamp(state.translation.y, -clampY, clampY),
    },
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
  const [stateValues, setStateValues] = useState<SvgScaleContextValues>({
    scale: 1,
    translation: {
      x: 0,
      y: 0,
    },
  });

  const [containerDimensions, setContainerDimensionsState] =
    useState<ContainerDimensions>({ width: 0, height: 0 });

  const containerDimensionsRef = useRef<ContainerDimensions>({
    width: 0,
    height: 0,
  });

  const setScale = useCallback(
    (newScale: number, origin?: Point) => {
      setStateValues((old) => {
        newScale = fitScale(newScale, containerDimensions);

        // Limit zoom levels
        if (newScale > zoomMax) {
          newScale = zoomMax;
        } else if (newScale <= zoomMin) {
          newScale = zoomMin;
        }

        let newTranslation: Translation | undefined;
        if (origin !== undefined) {
          // Origin needs to be translated to the canvas origin, which is center
          const translatedOriginX = origin.x - whiteboardWidth / 2;
          const translatedOriginY = origin.y - whiteboardHeight / 2;

          // Calculate offset to keep the origin at the same point on the viewport after scale
          const scaleChange = newScale - old.scale;
          const offsetX = -(translatedOriginX * scaleChange);
          const offsetY = -(translatedOriginY * scaleChange);

          newTranslation = {
            x: old.translation.x + offsetX,
            y: old.translation.y + offsetY,
          };
        }

        const newState: SvgScaleContextValues = {
          scale: newScale,
          translation: newTranslation ?? old.translation,
        };

        const fittedNewState = fitFunc(newState, containerDimensions);

        if (!isEqual(fittedNewState, old)) {
          return fittedNewState;
        }

        return old;
      });
    },
    [containerDimensions],
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
        containerDimensionsRef.current = dimensions;
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

  const updateTranslation = useCallback((changeX: number, changeY: number) => {
    setStateValues((old) => {
      const newState = {
        scale: old.scale,
        translation: {
          x: old.translation.x + changeX,
          y: old.translation.y + changeY,
        },
      };

      const fittedNewState = fitFunc(newState, containerDimensionsRef.current);

      if (!isEqual(fittedNewState, old)) {
        return fittedNewState;
      }

      return old;
    });
  }, []);

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
      return matrix.transformPoint(point);
    },
    [stateValues.scale, stateValues.translation.x, stateValues.translation.y],
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

  const moveToPoint = useCallback(
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
      const newStateValues = fitFunc(
        stateValues,
        containerDimensionsRef.current,
      );
      setStateValues(newStateValues);
    },
    [containerDimensionsRef],
  );

  const state: SvgScaleContextType = useMemo(() => {
    return {
      scale: stateValues.scale,
      setScale,
      updateScale,
      translation: stateValues.translation,
      updateTranslation,
      moveToPoint,
      containerDimensions,
      containerDimensionsRef: containerDimensionsRef,
      setContainerDimensions,
      transformPointSvgToContainer,
      viewportCanvasCenter,
    };
  }, [
    containerDimensions,
    setContainerDimensions,
    setScale,
    stateValues.scale,
    stateValues.translation,
    transformPointSvgToContainer,
    updateScale,
    moveToPoint,
    updateTranslation,
    viewportCanvasCenter,
  ]);

  return (
    <SvgScaleContext.Provider value={state}>
      {children}
    </SvgScaleContext.Provider>
  );
};
