// Create a jest config from our craco config.
const { createJestConfig } = require('@craco/craco');
const cracoConfig = require('./craco.config.cjs')({ env: 'test' });

module.exports = {
  // Use the craco.config file to get the defaults.
  ...createJestConfig(cracoConfig),
  // When running from the repository root directory, we
  // have to fix the root directory to the current directory.
  rootDir: '.',
  // When running from the root directory the detection whether
  // the setup file exists is broken, so we just add it here.
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    // Allow imports from other packages in this repository.
    '@nordeck/matrix-neoboard-(.*)': '<rootDir>/../packages/$1/src/index.ts',
  },
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
