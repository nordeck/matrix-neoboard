// Create a jest config by extending the default craco config.
const { createJestConfig } = require('@craco/craco');
const { transform } = require('lodash');
const cracoConfig = require('./craco.config.cjs')({ env: 'test' });

module.exports = {
  // As we don't have a craco config, we pass an empty one and
  // get the defaults.
  ...createJestConfig(cracoConfig),
  // When running from the repository root directory, we
  // have to fix the root directory to the current directory.
  rootDir: '.',
  // When running from the root directory the detection whether
  // the setup file exists is broken, so we just add it here.
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transformIgnorePatterns: [
    '!(/node_modules/.+.(js|jsx|mjs|cjs|ts|tsx|css)$)',
    '!(/src/.+.(js|jsx|mjs|cjs|ts|tsx|css)$)',
  ],
  // Fix CSS imports
  moduleNameMapper: {
    '\\.(css|svg)$': 'identity-obj-proxy',
  },
  // Fix ESM modules
  transform: {
    '^.+\\.(js|jsx|mjs|cjs|ts|tsx|css)$': ['@swc/jest'],
  },
};
