import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import ko from './locales/ko.json';
import type { Language } from '@/lib/domain/types';

const resources = {
  ko: { translation: ko },
  en: { translation: en },
};

export function initI18n(language: Language) {
  if (i18n.isInitialized) {
    i18n.changeLanguage(language);
    return i18n;
  }
  i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: 'ko',
    interpolation: { escapeValue: false },
  });
  return i18n;
}

export default i18n;
