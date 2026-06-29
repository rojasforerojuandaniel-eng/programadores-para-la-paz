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
  path.resolve(__dirname, '../../packages/shared'),
];

config.resolver.extraNodeModules = {
  '@rhynode/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
};

module.exports = config;
