/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/app/'],
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleFileExtensions: ['ios.js', 'android.js', 'native.js', 'js', 'mjs', 'cjs', 'jsx', 'ts', 'tsx', 'json', 'node'],
  haste: {
    defaultPlatform: 'ios',
    platforms: ['android', 'ios', 'native'],
  },
  resolver: '@react-native/jest-preset/jest/resolver.js',
  moduleNameMapper: {
    '^~/(.*)$': '<rootDir>/src/$1',
    '^@rhynode/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^react-test-renderer$':
      '<rootDir>/../../node_modules/.pnpm/react-test-renderer@19.2.3_react@19.0.0/node_modules/react-test-renderer',
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
  transformIgnorePatterns: ['/node_modules/react-native-reanimated/plugin/'],
};
