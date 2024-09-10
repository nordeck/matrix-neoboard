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

import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import jest from 'eslint-plugin-jest';
import notice from 'eslint-plugin-notice';
import pluginPromise from 'eslint-plugin-promise';
import react from 'eslint-plugin-react';
import testingLibrary from 'eslint-plugin-testing-library';
import path from 'path';
import ts from 'typescript-eslint';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default ts.config(
  {
    ignores: [
      '**/build/**',
      '**/coverage/**',
      '**/craco.config.cjs',
      '**/jest.config.cjs',
      '**/craco.config.js',
      '**/jest.config.js',
      '**/i18next-parser.config.js',
      '**/*test.ts.snap',
      'scripts/prepack.js',
      'scripts/postpack.js',
      'scripts/publishAllPackages.js',
    ],
  },
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  js.configs.recommended,
  ...ts.configs.recommended,
  pluginPromise.configs['flat/recommended'],
  {
    plugins: {
      notice,
      jest,
    },
    rules: {
      ...jest.configs['flat/recommended'].rules,
      'notice/notice': [
        'error',
        {
          templateFile: path.resolve(__dirname, './scripts/license-header.txt'),
          onNonMatchingHeader: 'replace',
          templateVars: { NAME: 'Nordeck IT + Consulting GmbH' },
          varRegexps: { NAME: /.+/ },
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'react-dom/test-utils',
              importNames: ['act'],
              message: 'Please import "act" from "react" instead',
            },
          ],
        },
      ],
      // Disable for the migration to prevent a lot of errors.
      // Should be revisisted
      '@typescript-eslint/ban-types': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      // Allow unused vars starting with _
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    ...react.configs.flat.recommended,
    rules: {
      ...react.configs.flat.recommended.rules,
      'react/display-name': 'off',
      'react/no-unescaped-entities': 'off',
      // Disabled to avoid weird error messages
      // https://github.com/jsx-eslint/eslint-plugin-react/issues?q=is%3Aissue+is%3Aopen+forwardRef
      'react/prop-types': 'off',
      // Disabled because it would conflict with removing unused imports
      'react/react-in-jsx-scope': 'off',
    },
  },
  // Test-specific configuration
  {
    files: ['**/*.test.*'],
    plugins: {
      // See https://github.com/testing-library/eslint-plugin-testing-library/issues/899#issuecomment-2121272355 and
      // https://github.com/testing-library/eslint-plugin-testing-library/issues/924
      'testing-library': fixupPluginRules({
        rules: testingLibrary.rules,
      }),
    },
    rules: {
      ...testingLibrary.configs['flat/react'].rules,
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      'react/display-name': 'off',
    },
  },
  eslintConfigPrettier,
);
