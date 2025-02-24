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
import { infiniteCanvasMode } from '../../../model';
import { Point } from '../../../state';
import {
  initialWhiteboardHeight,
  initialWhiteboardWidth,
  whiteboardHeight,
  whiteboardWidth,
  zoomMax,
  zoomMin,
} from '../constants';
import { SvgScaleContext, SvgScaleContextType } from './context';

type SvgScaleContextValues = Pick<SvgScaleContextType, 'scale' | 'translation'>;

const fitFunc = (state: SvgScaleContextValues): SvgScaleContextValues => {
  // TODO - evil hack for the infinite canvas spike
  const boardWrapperElement = document.getElementById('board-wrapper');
  const boardWrapperDimensions = {
    width: boardWrapperElement!.clientWidth,
    height: boardWrapperElement!.clientHeight,
  };

  if (!infiniteCanvasMode) {
    // Fit initial canvas to be contained in the viewport

    if (
      boardWrapperDimensions.width > initialWhiteboardWidth &&
      boardWrapperDimensions.height > initialWhiteboardHeight
    ) {
      // Container DIV is larger than initial whiteboard, center it
      return {
        ...state,
        scale: 1,
        translation: {
          x: boardWrapperDimensions.width / 2,
          y: boardWrapperDimensions.height / 2,
        },
      };
    }

    const containerHasPortraitRatio =
      boardWrapperDimensions.width / boardWrapperDimensions.height >
      whiteboardWidth / whiteboardHeight;

    if (containerHasPortraitRatio) {
      // Fit height
      const scale = boardWrapperDimensions.height / initialWhiteboardHeight;

      return {
        ...state,
        scale,
        translation: {
          x: boardWrapperDimensions.width / 2,
          y: boardWrapperDimensions.height / 2,
        },
      };
    }

    // Fit width
    return {
      ...state,
      scale: boardWrapperDimensions.width / initialWhiteboardWidth,
      translation: {
        x: boardWrapperDimensions.width / 2,
        y: boardWrapperDimensions.height / 2,
      },
    };
  }

  const minScaleX = boardWrapperDimensions.width / whiteboardWidth;
  const minScaleY = boardWrapperDimensions.height / whiteboardHeight;
  const fittedScale = Math.max(state.scale, minScaleX, minScaleY);

  const clampXStart = (whiteboardWidth / 2) * fittedScale;
  const clampXEnd =
    boardWrapperDimensions.width - (whiteboardWidth / 2) * fittedScale;
  const clampYStart = (whiteboardHeight / 2) * fittedScale;
  const clampYEnd =
    boardWrapperDimensions.height - (whiteboardHeight / 2) * fittedScale;

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

      const fittedState = fitFunc(newState);

      if (!isEqual(fittedState, stateValues)) {
        setStateValues(fittedState);
      }
    },
    [stateValues],
  );

  const updateScale = useCallback(
    (scaleChange: number, origin?: Point) => {
      const newScale = stateValues.scale + scaleChange;
      setScale(newScale, origin);
    },
    [setScale, stateValues.scale],
  );

  const refreshCanvas = useCallback(() => {
    const fittedState = fitFunc(stateValues);
    if (!isEqual(fittedState, stateValues)) {
      setStateValues(fittedState);
    }
  }, [stateValues]);

  const updateTranslation = useCallback(
    (changeX: number, changeY: number) => {
      const newState = {
        ...stateValues,
        translation: {
          x: stateValues.translation.x + changeX,
          y: stateValues.translation.y + changeY,
        },
      };

      const fittedState = fitFunc(newState);

      if (!isEqual(fittedState, stateValues)) {
        setStateValues(fittedState);
      }
    },
    [stateValues],
  );

  const state: SvgScaleContextType = useMemo(() => {
    return {
      scale: stateValues.scale,
      setScale,
      updateScale,
      translation: stateValues.translation,
      updateTranslation,
      refreshCanvas,
    };
  }, [
    refreshCanvas,
    setScale,
    stateValues.scale,
    stateValues.translation,
    updateScale,
    updateTranslation,
  ]);

  return (
    <SvgScaleContext.Provider value={state}>
      {children}
    </SvgScaleContext.Provider>
  );
};
