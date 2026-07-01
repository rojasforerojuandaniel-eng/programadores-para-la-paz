global.__DEV__ = true;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.__fbBatchedBridgeConfig = { remoteModuleConfig: [] };

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'es', languageTag: 'es-CO', regionCode: 'CO' }]),
}));

require('~/lib/i18n');
