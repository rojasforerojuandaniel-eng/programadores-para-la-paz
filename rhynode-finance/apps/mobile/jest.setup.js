global.__DEV__ = true;
global.IS_REACT_ACT_ENVIRONMENT = true;
global.IS_REACT_NATIVE_TEST_ENVIRONMENT = true;
global.cancelAnimationFrame = (id) => clearTimeout(id);
global.__fbBatchedBridgeConfig = { remoteModuleConfig: [] };

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(() => [{ languageCode: 'es', languageTag: 'es-CO', regionCode: 'CO' }]),
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
