import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import mnTranslations from './locales/mn.json';
import zhTWTranslations from './locales/zh-TW.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  mn: {
    translation: mnTranslations,
  },
  'zh-TW': {
    translation: zhTWTranslations,
  },
};

// Get saved language from localStorage or default to 'mn'
const savedLanguage = localStorage.getItem('language') || 'mn';

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Keep <html lang> in step with the UI language. Without this a screen reader
// reads every Mongolian string with an English voice, which is unusable.
const applyDocumentLanguage = (language) => {
  if (typeof document !== 'undefined' && language) {
    document.documentElement.setAttribute('lang', language);
  }
};

applyDocumentLanguage(savedLanguage);
i18n.on('languageChanged', applyDocumentLanguage);

export default i18n;
