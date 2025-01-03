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
  snapshotFailed: boolean;
};

const initialState: ConnectionInfoState = {
  snapshotFailed: false,
};

export const connectionInfoSlice = createSlice({
  name: 'connectionInfo',
  initialState,
  reducers: {
    setSnapshotFailed: (state) => {
      return {
        ...state,
        snapshotFailed: true,
      };
    },
    setSnapshotSuccessful: (state) => {
      return {
        ...state,
        snapshotFailed: false,
      };
    },
  },
});

export const { setSnapshotFailed, setSnapshotSuccessful } =
  connectionInfoSlice.actions;

export const selectConnectionInfo = (state: RootState) =>
  state.connectionInfoReducer;

export const connectionInfoReducer = connectionInfoSlice.reducer;
