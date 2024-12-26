/*
 * Copyright 2022 Nordeck IT + Consulting GmbH
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

import { WidgetApi } from '@matrix-widget-toolkit/api';
import { autoBatchEnhancer, configureStore } from '@reduxjs/toolkit';
import { baseApi } from './api/baseApi';
import { loggerMiddleware } from './loggerMiddleware';
import { shapeSizesReducer } from './shapeSizesSlide';
import { snapshotInfoReducer } from './snapshotInfoSlice';

export function createStore({
  widgetApi,
}: {
  widgetApi: WidgetApi | Promise<WidgetApi>;
}) {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      snapshotInfoReducer,
      shapeSizesReducer,
    },
    middleware: (getDefaultMiddleware) => {
      return getDefaultMiddleware({
        serializableCheck: {
          // permits the use of a function as a 'validator' in the documentSnapshotApi
          ignoredPaths: ['meta.arg', 'payload.timestamp', /validator$/],
        },
        thunk: {
          extraArgument: {
            widgetApi,
          } as ThunkExtraArgument,
        },
      }).concat(baseApi.middleware, loggerMiddleware);
    },
    enhancers: (getDefaultEnhancers) => {
      return getDefaultEnhancers().concat(
        autoBatchEnhancer(
          // Disable the auto batching when running tests in JSDOM, as it
          // conflicts with fake timers.
          navigator.userAgent.includes('jsdom') ? { type: 'tick' } : undefined,
        ),
      );
    },
  });
  return store;
}

export type StoreType = ReturnType<typeof createStore>;

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<StoreType['getState']>;
export type AppDispatch = StoreType['dispatch'];

/**
 * Extra arguments that are provided to `createAsyncThunk`
 */
export type ThunkExtraArgument = {
  widgetApi: WidgetApi | Promise<WidgetApi>;
};
