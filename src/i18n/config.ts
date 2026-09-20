import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./en.json";
import fr from "./fr.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "fr"],
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
  });

// Keep <html lang> in step with the UI language, and tell browsers not to machine-translate an
// interface that already has its own translations (they used to re-translate parts of it).
const applyDocumentLanguage = (lng: string) => {
  document.documentElement.lang = lng.split("-")[0];
  document.documentElement.setAttribute("translate", "no");
};
applyDocumentLanguage(i18n.language || "en");
i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;
