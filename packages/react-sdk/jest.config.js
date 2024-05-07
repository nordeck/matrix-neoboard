// Create a jest config by extending the default craco config.
const { createJestConfig } = require('@craco/craco');
const cracoConfig = require('./craco.config')({ env: 'test' });

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
    '(?!(/node_modules/(lib0)/))(/node_modules/.+.(js|jsx|mjs|cjs|ts|tsx)$)',
  ],
};
