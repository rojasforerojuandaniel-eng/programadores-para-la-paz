/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/app/', '<rootDir>/__tests__/mocks/'],
  collectCoverageFrom: [
    'src/hooks/**/*.ts',
    'src/lib/**/*.ts',
    '!src/lib/i18n.ts',
    '!src/lib/theme.tsx',
    '!src/lib/query-client.ts',
    '!src/lib/sentry.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
    'src/hooks/**/*.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'src/lib/**/*.ts': {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ios.js', 'android.js', 'native.js', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'json', 'node'],
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
  },
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
    '^@rhynode/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^react-test-renderer$':
      '<rootDir>/../../node_modules/.pnpm/react-test-renderer@19.0.0_react@19.0.0/node_modules/react-test-renderer',
  },
  transform: {
    '\\.[jt]sx?$': [
      'babel-jest',
      {
        babelrc: false,
        configFile: false,
        presets: ['babel-preset-expo'],
      },
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!.pnpm/)',
  ],
};
