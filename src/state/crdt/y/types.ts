/*
 * Copyright 2023 Nordeck IT + Consulting GmbH
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

import type { Array as YArray, Map as YMap, Text as YText } from 'yjs';
export { Array as YArray, Map as YMap, Text as YText } from 'yjs';

export interface SharedMap<
  Data,
  Keys extends keyof Data & string = keyof Data & string,
> extends YMap<unknown> {
  clone(): SharedMap<Data, Keys>;
  delete(key: Keys & string): void;
  set<Key extends Keys>(key: Key, value: Data[Key]): Data[Key];
  get<Key extends Keys>(key: Key): Data[Key];
  has<Key extends Keys>(key: Key): boolean;
  clear(): void;
  toJSON(): ConvertToJson<Data>;
}

type ConvertToJson<O> = {
  [K in keyof O]: O[K] extends YMap<SharedMap<infer U>>
    ? Record<string, ConvertToJson<U>>
    : O[K] extends YMap<infer U>
    ? Record<string, ConvertToJson<U>>
    : O[K] extends YArray<infer T>
    ? Array<ConvertToJson<T>>
    : O[K] extends YText
    ? string
    : O[K];
};
