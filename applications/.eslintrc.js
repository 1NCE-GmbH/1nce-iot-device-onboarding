module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: ['standard-with-typescript'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module',
    tsconfigRootDir: __dirname,
    project: './tsconfig.eslint.json'
  },
  plugins: [
    '@typescript-eslint',
    'jest'
  ],
  rules: {
    '@typescript-eslint/semi': ['warn', 'always', { omitLastInOneLineBlock: true }],
    '@typescript-eslint/quotes': ['warn', 'double', { avoidEscape: true, allowTemplateLiterals: false }],
    'comma-dangle': 'off',
    '@typescript-eslint/comma-dangle': ['warn', 'always-multiline'],
    '@typescript-eslint/member-delimiter-style': ['error', {
      multiline: {
        delimiter: 'semi',
        requireLast: true,
      },
      singleline: {
        delimiter: 'semi',
        requireLast: false,
      },
      multilineDetection: 'brackets'
    }],
    '@typescript-eslint/strict-boolean-expressions': 'off',
    '@typescript-eslint/space-before-function-paren': ['warn', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
    '@typescript-eslint/return-await': 'off'
  },
  overrides: [
    {
      files: ['*.spec.ts'],
      env: { jest: true },
      rules: {
        'import/first': 'off'
      },
    },
    {
      // These overrides are necessary because standard-with-typescript does not set rules for .js files
      files: ['*.js', '*.jsx'],
      rules: {
        semi: 'off',
        quotes: 'off',
        '@typescript-eslint/quotes': ['warn', 'single', { avoidEscape: true, allowTemplateLiterals: false }],
        '@typescript-eslint/comma-dangle': ['warn', 'only-multiline'],
      }
    }
  ],
  ignorePatterns: [
    '/coverage',
    '/dist',
    '*.config.js'
  ],
};
