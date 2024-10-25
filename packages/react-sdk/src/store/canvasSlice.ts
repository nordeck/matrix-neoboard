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
import { RootState } from './store';

type Translation = { x: number; y: number };

export type ShapeSizesState = {
  scale: number;
  translate: Translation;
};

const initialState: ShapeSizesState = {
  scale: 1,
  translate: { x: 0, y: 0 },
};

export const canvasSlice = createSlice({
  name: 'canvas',
  initialState,
  reducers: {
    updateScale: (state, action: PayloadAction<number>) => {
      return {
        ...state,
        scale: state.scale + action.payload,
      };
    },
    updateTranslation: (state, action: PayloadAction<Translation>) => {
      return {
        ...state,
        translate: {
          x: state.translate.x + action.payload.x,
          y: state.translate.y + action.payload.y,
        },
      };
    },
  },
});

export const { updateTranslation } = canvasSlice.actions;
export const { updateScale } = canvasSlice.actions;

export const selectCanvas = (state: RootState) => state.canvasReducer;

export const canvasReducer = canvasSlice.reducer;
