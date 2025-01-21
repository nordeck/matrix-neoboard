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

import { createSlice } from '@reduxjs/toolkit';
import { RootState } from './store';

export type ConnectionInfoState = {
  snapshotSaveFailed: boolean;
  snapshotLoadFailed: boolean | undefined;
};

const initialState: ConnectionInfoState = {
  snapshotSaveFailed: false,
  snapshotLoadFailed: undefined,
};

export const connectionInfoSlice = createSlice({
  name: 'connectionInfo',
  initialState,
  reducers: {
    setSnapshotSaveFailed: (state) => {
      return {
        ...state,
        snapshotSaveFailed: true,
      };
    },
    setSnapshotSaveSuccessful: (state) => {
      return {
        ...state,
        snapshotSaveFailed: false,
      };
    },
    setSnapshotLoadFailed: (state) => {
      return {
        ...state,
        snapshotLoadFailed: true,
      };
    },
    setSnapshotLoadSuccessful: (state) => {
      return {
        ...state,
        snapshotLoadFailed: false,
      };
    },
  },
});

export const {
  setSnapshotSaveFailed,
  setSnapshotSaveSuccessful,
  setSnapshotLoadFailed,
  setSnapshotLoadSuccessful,
} = connectionInfoSlice.actions;

export const selectConnectionInfo = (state: RootState) =>
  state.connectionInfoReducer;

export const connectionInfoReducer = connectionInfoSlice.reducer;
