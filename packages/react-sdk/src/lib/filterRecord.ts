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

/**
 * Filter a record.
 *
 * @param items - items to filter
 * @param filterFunc - filter function
 * @returns record with all props for which the filter function returned true
 */
export const filterRecord = <V>(
  items: Record<string, V>,
  filterFunc: (item: V) => boolean,
) => {
  const filtered: Record<string, V> = {};

  Object.entries(items).forEach(([key, item]) => {
    if (filterFunc(item)) {
      filtered[key] = item;
    }
  });

  return filtered;
};
