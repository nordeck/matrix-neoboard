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

import { sentryVitePlugin } from '@sentry/vite-plugin';
import basicSsl from '@vitejs/plugin-basic-ssl';
import react from '@vitejs/plugin-react-swc';
import { Plugin, PluginOption, defineConfig } from 'vite';

const plugins: [Plugin | PluginOption] = [react()];
let port = 5273;

if (process.env.VITE_DEV_SSL === 'true') {
  plugins.push(basicSsl());
  port = 5274;
}

// Uploads the sourcemaps to Sentry
if (process.env.SENTRY_AUTH_TOKEN) {
  plugins.push(
    sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      telemetry: false,
    }),
  );
}

// https://vitejs.dev/config/
export default defineConfig({
  // overriding the default '/' base allows for sub-path deployments
  base: '',
  esbuild: {
    // needed to fix neoboard yjs errors, see: https://github.com/vitejs/vite/issues/11722
    target: 'es2020',
  },
  build: {
    outDir: 'build',
    commonjsOptions: {
      strictRequires: true,
    },
    // Required to upload sourcemaps to Sentry
    sourcemap: process.env.SENTRY_AUTH_TOKEN
      ? true
      : process.env.NODE_ENV === 'development',
  },
  resolve: {
    dedupe: [
      'react',
      'react-dom',
      'react-i18next',
      'react-use',
      'react-redux',
      '@mui/material',
      '@matrix-widget-toolkit/react',
    ],
  },
  server: {
    fs: {
      strict: false,
    },
    port,
    strictPort: true,
  },
  preview: {
    port: port - 1000,
    strictPort: true,
  },
  plugins,
  // Use the env prefix from CRA for backward compatibility.
  envPrefix: 'REACT_APP_',
});
