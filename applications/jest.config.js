module.exports = {
  roots: [
    '<rootDir>'
  ],
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }]
  },
  testResultsProcessor: 'jest-sonar-reporter',
  collectCoverageFrom: [
    '**/*.{js,jsx,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!*.config.js',
    '!**/src/shared/test/**',
    '!.eslintrc.js',
    '!coverage/**',
  ],
  modulePathIgnorePatterns: [
    'dist'
  ],
  globals: {
  },
};
