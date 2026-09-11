import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import mnTranslations from './locales/mn.json';

const resources = {
  en: {
    translation: enTranslations,
  },
  mn: {
    translation: mnTranslations,
  },
};

// Get saved language from localStorage or default to 'mn'. A visitor who
// picked a locale we no longer ship (zh-TW) must land on Mongolian, the
// default — not on i18next's English fallback.
const SUPPORTED = ['mn', 'en'];
const stored = localStorage.getItem('language');
const savedLanguage = SUPPORTED.includes(stored) ? stored : 'mn';
if (stored && stored !== savedLanguage) localStorage.setItem('language', savedLanguage);

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
