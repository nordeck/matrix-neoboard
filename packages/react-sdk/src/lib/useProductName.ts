/*
 * Copyright 2026 Nordeck IT + Consulting GmbH
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

import { getEnvironment } from '@matrix-widget-toolkit/mui';
import { useMemo } from 'react';

/**
 * Returns the configured product name (`REACT_APP_PRODUCT_NAME`, defaults to
 * `NeoBoard`) to be used in UI texts, e.g. as `productName` translation value.
 */
export function useProductName(): string {
  return useMemo(
    () => getEnvironment('REACT_APP_PRODUCT_NAME', 'NeoBoard'),
    [],
  );
}
