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

import path from 'path';
import { defineConfig } from 'vitest/config';

const __dirname = path.dirname(__filename);

export default defineConfig({
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'react-use',
      'react-redux',
      '@mui/material',
      // Needed as both projects run in the same context and otherwise might cause issues sometimes
      '@nordeck/matrix-neoboard-widget',
    ],
  },
  test: {
    // Happy-Dom has no support for the blob: scheme. So we need to use jsdom
    environment: 'jsdom',
    setupFiles: [path.resolve(__dirname, './src/setupTests.ts')],
    exclude: ['build', 'lib'],
    server: {
      deps: {
        inline: [
          '@matrix-widget-toolkit/testing',
          '@matrix-widget-toolkit/api',
          '@matrix-widget-toolkit/react',
          '@matrix-widget-toolkit/mui',
        ],
      },
    },
  },
});
