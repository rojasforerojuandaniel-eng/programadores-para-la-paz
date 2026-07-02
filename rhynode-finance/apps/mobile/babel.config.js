const { expoRouterBabelPlugin } = require('babel-preset-expo/build/expo-router-plugin');

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      'react-native-reanimated/plugin',
      // pnpm workspaces isolate packages in the root store, so babel-preset-expo's
      // internal `hasModule('expo-router')` check fails to detect expo-router.
      // Adding the router plugin explicitly ensures EXPO_ROUTER_APP_ROOT is
      // inlined for release bundles.
      expoRouterBabelPlugin,
    ],
  };
};
