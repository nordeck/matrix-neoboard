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
import { whiteboardWidth } from '../components/Whiteboard';
import { initialWhiteboardWidth } from '../components/Whiteboard/constants';
import { RootState } from './store';

type Translation = { x: number; y: number };

export type ShapeSizesState = {
  outerScale: number;
  scale: number;
  translate: Translation;
};

const initialState: ShapeSizesState = {
  outerScale: 1,
  scale: 5,
  translate: { x: 0, y: 0 },
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    updateOuterScale: (state, action: PayloadAction<number>) => {
      return {
        ...state,
        outerScale: action.payload,
      };
    },
    updateScale: (state, action: PayloadAction<number>) => {
      const newScale = state.scale + action.payload;

      if (newScale < 1) {
        // Cannot zoom out less than 100 %
        return state;
      }

      if (newScale > 5) {
        // Cannot zoom in more than 5 times
        return state;
      }

      // fit func

      return {
        ...state,
        scale: newScale,
      };
    },
    updateTranslation: (state, action: PayloadAction<Translation>) => {
      const combinedScale = state.scale * state.outerScale;
      const capX =
        ((whiteboardWidth - initialWhiteboardWidth) / 2) * combinedScale;

      const calculatedNewX = state.translate.x + action.payload.x;

      const newX = Math.min(capX, calculatedNewX);

      console.log('MiW ', {
        outerScale: state.outerScale,
        scale: state.scale,
        translateX: state.translate.x,
        translateY: state.translate.y,
        capX,
        calculatedNewX,
        newX,
      });

      // fit func

      return {
        ...state,
        translate: {
          x: newX,
          y: state.translate.y + action.payload.y,
        },
      };
    },
  },
});

export const { updateScale, updateOuterScale, updateTranslation } =
  canvasSlice.actions;

export const selectCanvas = (state: RootState) => state.canvasReducer;

export const selectCombinedScale = (state: RootState) =>
  state.canvasReducer.scale * state.canvasReducer.outerScale;

export const selectTranslate = (state: RootState) =>
  state.canvasReducer.translate;

export const canvasReducer = canvasSlice.reducer;
