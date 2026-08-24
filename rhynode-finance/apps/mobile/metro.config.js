const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Force project root
config.projectRoot = projectRoot;

// Watch monorepo root for shared packages
config.watchFolders = [monorepoRoot];

// Resolve node_modules from both locations
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Disable symlinks to avoid resolving through monorepo root
config.resolver.unstable_enableSymlinks = false;

module.exports = config;
