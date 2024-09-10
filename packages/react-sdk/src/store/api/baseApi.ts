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

import { fakeBaseQuery } from '@reduxjs/toolkit/query';
import { createApi } from '@reduxjs/toolkit/query/react';

export type BaseApiError = {
  name: 'UpdateFailed' | 'LoadFailed';
  message: string;
};

/**
 * The basis API that can be extended by {@code baseApi.injectEndpoints({})}.
 *
 * The API must not provide any endpoints to avoid any bidirectional
 * dependencies with this file.
 *
 * @remarks See also https://redux-toolkit.js.org/rtk-query/usage/code-splitting
 */
export const baseApi = createApi({
  reducerPath: 'baseApi',
  baseQuery: fakeBaseQuery<BaseApiError>(),
  endpoints: () => ({}),
});
