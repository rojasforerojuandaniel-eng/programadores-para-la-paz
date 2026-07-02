import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import es from '../locales/es.json';
import en from '../locales/en.json';

const LOCALE_KEY = '@rhynode/locale';
const resources = {
  es: { translation: es },
  en: { translation: en },
};

const defaultLng = Localization.getLocales()[0]?.languageCode ?? 'es';

void i18n.use(initReactI18next).init({
  resources,
  lng: defaultLng,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

void (async () => {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_KEY);
    if (stored && stored !== i18n.language) {
      await i18n.changeLanguage(stored);
    }
  } catch {
    // Ignore storage read errors; the default/fallback locale is already active.
  }
})();

export default i18n;
