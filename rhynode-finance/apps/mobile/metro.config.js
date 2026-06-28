const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.watchFolders = [
  path.resolve(__dirname, '../../packages/shared'),
];

config.resolver.extraNodeModules = {
  '@rhynode/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
};

module.exports = config;
