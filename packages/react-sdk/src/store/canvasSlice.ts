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

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { clamp } from 'lodash';
import {
  initialWhiteboardHeight,
  initialWhiteboardWidth,
  whiteboardHeight,
  whiteboardWidth,
  zoomMax,
  zoomMin,
} from '../components/Whiteboard/constants';
import { RootState } from './store';

type Translation = { x: number; y: number };

export type CanvasState = {
  infiniteMode: boolean;
  outerScale: number;
  scale: number;
  translate: Translation;
};

const initialState: CanvasState = {
  infiniteMode: false,
  outerScale: 1,
  scale: 1,
  translate: {
    x: 0,
    y: 0,
  },
};

const fitFunc = (state: CanvasState): CanvasState => {
  // TODO - evil hack for the infinite canvas spike
  const boardWrapperElement = document.getElementById('board-wrapper');
  const boardWrapperDimensions = {
    width: boardWrapperElement!.clientWidth,
    height: boardWrapperElement!.clientHeight,
  };

  if (!state.infiniteMode) {
    // Fit initial canvas to be contained in the viewport

    if (
      boardWrapperDimensions.width > initialWhiteboardWidth &&
      boardWrapperDimensions.height > initialWhiteboardHeight
    ) {
      // Container DIV is larger than initial whiteboard, center it
      return {
        ...state,
        scale: 1,
        translate: {
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
        translate: {
          x: boardWrapperDimensions.width / 2,
          y: boardWrapperDimensions.height / 2,
        },
      };
    }

    // Fit width
    return {
      ...state,
      scale: boardWrapperDimensions.width / initialWhiteboardWidth,
      translate: {
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
    translate: {
      x: clamp(state.translate.x, clampXEnd, clampXStart),
      y: clamp(state.translate.y, clampYEnd, clampYStart),
    },
  };
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    refreshCanvas: (state) => {
      return fitFunc({ ...state });
    },
    setInfiniteMode: (state, action: PayloadAction<boolean>) => {
      const newState = {
        ...state,
        infiniteMode: action.payload,
      };

      return fitFunc(newState);
    },
    updateOuterScale: (state, action: PayloadAction<number>) => {
      return {
        ...state,
        outerScale: action.payload,
      };
    },
    updateScale: (state, action: PayloadAction<number>) => {
      let newScale = state.scale + action.payload;

      // Limit zoom levels
      if (newScale > zoomMax) {
        newScale = zoomMax;
      } else if (newScale <= zoomMin) {
        newScale = zoomMin;
      }

      const newState = {
        ...state,
        scale: newScale,
      };

      return fitFunc(newState);
    },
    updateTranslation: (state, action: PayloadAction<Translation>) => {
      const newState = {
        ...state,
        translate: {
          x: state.translate.x + action.payload.x,
          y: state.translate.y + action.payload.y,
        },
      };

      return fitFunc(newState);
    },
  },
});

export const {
  refreshCanvas,
  setInfiniteMode,
  updateScale,
  updateOuterScale,
  updateTranslation,
} = canvasSlice.actions;

export const selectCanvas = (state: RootState) => state.canvasReducer;

export const selectCombinedScale = (state: RootState) =>
  state.canvasReducer.scale * state.canvasReducer.outerScale;

export const selectTranslate = (state: RootState) =>
  state.canvasReducer.translate;

export const canvasReducer = canvasSlice.reducer;
