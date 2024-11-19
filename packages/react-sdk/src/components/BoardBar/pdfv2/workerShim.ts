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

// @ts-expect-error -- Required for react-pdf to work in workers. This is a magic vite import
import RefreshRuntime from '/@react-refresh';

if (
  typeof WorkerGlobalScope !== 'undefined' &&
  self instanceof WorkerGlobalScope
) {
  self.global = self;
  self.window = self;
  globalThis.global = self;
  globalThis.window = self;
}

if (import.meta.hot) {
  RefreshRuntime.injectIntoGlobalHook(window);
  // @ts-expect-error -- Required for react-pdf to work in workers
  window.$RefreshReg$ = () => {};
  // @ts-expect-error -- Required for react-pdf to work in workers
  window.$RefreshSig$ = () => (type) => type;
  // @ts-expect-error -- Required for react-pdf to work in workers
  window.__vite_plugin_react_preamble_installed__ = true;
}
