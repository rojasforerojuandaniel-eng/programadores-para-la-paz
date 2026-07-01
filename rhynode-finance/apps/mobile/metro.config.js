const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Force Metro/project discovery to use apps/mobile as the root.
config.projectRoot = __dirname;

// Limit Metro workers to avoid saturating the available RAM.
config.maxWorkers = 2;

// pnpm uses symlinks in node_modules; Metro must follow them.
config.resolver.unstable_enableSymlinks = true;
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '../../node_modules'),
];

config.watchFolders = [
  path.resolve(__dirname),
  path.resolve(__dirname, '../../packages/shared'),
];

config.resolver.extraNodeModules = {
  '@rhynode/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
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
