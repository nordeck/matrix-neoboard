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

import { renderPDF } from './pdf.local';

if (import.meta.hot) {
  self.window = self;
  // @ts-expect-error - HMR workaround for https://github.com/vitejs/vite/issues/5396
  const RefreshRuntime = await import('/@react-refresh');
  RefreshRuntime.injectIntoGlobalHook(self);
  // @ts-expect-error - HMR workaround for https://github.com/vitejs/vite/issues/5396
  self.$RefreshReg$ = () => { };
  // @ts-expect-error - HMR workaround for https://github.com/vitejs/vite/issues/5396
  self.$RefreshSig$ = () => type => type;
  // @ts-expect-error - HMR workaround for https://github.com/vitejs/vite/issues/5396
  window.__vite_plugin_react_preamble_installed__ = true
}

// A Web Worker that generates the PDF in the background
self.onmessage = async (e: MessageEvent) => {
  console.log('Worker received message', e);
  const data = e.data;

  try {
    const renderedPDF = await renderPDF(data);
    self.postMessage(renderedPDF);
  } catch (error) {
    console.error('Error rendering PDF', error);
    throw error;
  }
};
