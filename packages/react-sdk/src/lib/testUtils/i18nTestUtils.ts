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

import i18next, { i18n, Resource } from 'i18next';

/**
 * Creates a separate i18next instance for tests that need specific
 * translations or a specific language.
 *
 * Pass the instance to the component via `I18nextProvider`. It is not
 * registered globally with `initReactI18next`, so other tests keep using the
 * default instance.
 *
 * @param lng - The language of the instance.
 * @param resources - The translations of the instance.
 */
export function setupI18n(lng: string, resources: Resource): i18n {
  const instance = i18next.createInstance();
  instance.init({ lng, resources });
  return instance;
}
