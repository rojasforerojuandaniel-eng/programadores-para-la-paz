global.__DEV__ = true;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.__fbBatchedBridgeConfig = { remoteModuleConfig: [] };

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'es', languageTag: 'es-CO', regionCode: 'CO' }]),
}));

jest.mock('expo/virtual/env.js', () => ({
  env: process.env,
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-web-browser', () => ({
  __esModule: true,
  openBrowserAsync: jest.fn(() => Promise.resolve({ type: 'dismiss' })),
  maybeCompleteAuthSession: jest.fn(),
  dismissBrowser: jest.fn(() => Promise.resolve({ type: 'dismiss' })),
  WebBrowserResultType: { DISMISS: 'dismiss', LOCKED: 'locked', OPENED: 'opened', CANCEL: 'cancel' },
}));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  close: jest.fn(),
  wrap: (Component) => Component,
}));

jest.mock('posthog-react-native', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    capture: jest.fn(),
    optOut: jest.fn(),
  })),
}));

const mockI18n = require('i18next');
const { initReactI18next } = require('react-i18next');
const es = require('./src/locales/es.json');
const en = require('./src/locales/en.json');

void mockI18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
  },
  lng: 'es',
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

jest.doMock('~/lib/i18n', () => mockI18n);
