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
import { ShapeKind, Size } from '../state';
import { RootState } from './store';

export type ShapeSizesState = {
  [K in ShapeKind]: Size;
};

const initialState: ShapeSizesState = {
  rectangle: { width: 160, height: 120 },
  circle: { width: 160, height: 160 },
  ellipse: { width: 160, height: 160 },
  triangle: { width: 160, height: 160 },
};

export type SetShapeSizePayload = {
  kind: ShapeKind;
  size: Size;
};

export const shapeSizesSlice = createSlice({
  name: 'shapeSizes',
  initialState,
  reducers: {
    setShapeSize: (state, action: PayloadAction<SetShapeSizePayload>) => {
      return {
        ...state,
        [action.payload.kind]: action.payload.size,
      };
    },
  },
});

export const { setShapeSize } = shapeSizesSlice.actions;

export const selectShapeSizes = (state: RootState) => state.shapeSizesReducer;

export const shapeSizesReducer = shapeSizesSlice.reducer;
