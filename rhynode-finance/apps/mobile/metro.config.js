const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const path = require('path');

const config = getSentryExpoConfig(__dirname);

// Force Metro/project discovery to use apps/mobile as the root.
config.projectRoot = __dirname;

// Limit Metro workers to avoid saturating the available RAM.
config.maxWorkers = 2;

// Preserve Expo's default watch folders (workspace root node_modules + local
// packages) and extend them with the monorepo root and pnpm store. The pnpm
// store is watched so Metro can compute SHA-1 for files reached through
// symlinks during native embed builds.
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, '../..'),
  path.resolve(__dirname, '../../node_modules/.pnpm'),
  path.resolve(__dirname, '../../packages/shared'),
];

// pnpm workspaces isolate packages in the root store, so point Metro at the
// local and root node_modules directories.
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];

config.resolver.extraNodeModules = {
  '@rhynode/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
  react: path.resolve(__dirname, '../../node_modules/.pnpm/react@19.0.0/node_modules/react'),
  'react-dom': path.resolve(__dirname, '../../node_modules/.pnpm/react-dom@19.0.0_react@19.0.0/node_modules/react-dom'),
};

// Prevent Metro from resolving the newer React 19.2.x used by the web apps in
// the monorepo root. react-native 0.79.x is locked to React 19.0.0, so only the
// workspace's React 19.0.0 copy is allowed in the Android bundle.
const blockedReactPattern = /node_modules\/\.pnpm\/react@19\.[2-9]/;
const existingBlockList = config.resolver.blockList
  ? Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : [config.resolver.blockList]
  : [];
config.resolver.blockList = [
  ...existingBlockList,
  blockedReactPattern,
];

module.exports = config;
