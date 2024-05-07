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

module.exports = function ({ env }) {
  if (env === 'test') {
    return {
      babel: {
        plugins: [
          // use babel-plugin-transform-import-meta in jest because it can't work with import.meta.url
          // that is required to import web workers in webpack 5
          'babel-plugin-transform-import-meta',
        ],
      },
    };
  }

  return {
    plugins: [{ plugin: importLocalPackages() }],
  };
};

/**
 * Craco plugin for using local packages from the same mono repository.
 */
function importLocalPackages() {
  const path = require('path');
  const { getLoader, loaderByName } = require('@craco/craco');
  const absolutePath = path.join(__dirname, '../packages');

  function overrideWebpackConfig({ webpackConfig, context }) {
    const { isFound, match } = getLoader(
      webpackConfig,
      loaderByName('babel-loader'),
    );
    if (isFound) {
      const include = Array.isArray(match.loader.include)
        ? match.loader.include
        : [match.loader.include];

      match.loader.include = include.concat(absolutePath);
    }
    return webpackConfig;
  }

  return {
    overrideWebpackConfig,
  };
}
