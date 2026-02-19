import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n/config";

const FLAGS = [
  { lang: "en", flag: "🇬🇧", label: "English" },
  { lang: "fr", flag: "🇫🇷", label: "Français" },
];

async function detectCountryFromIP(): Promise<string | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data?.country_code ?? null;
  } catch {
    return null;
  }
}

export function LandingLanguageSwitcher() {
  const { i18n: i18nHook } = useTranslation();
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    // Only auto-detect once per session
    const alreadySet = sessionStorage.getItem("landing_lang_set");
    if (alreadySet) { setDetected(true); return; }

    // Default to English for the landing page unless IP says French-speaking country
    const stored = localStorage.getItem("i18nextLng");
    if (stored && (stored === "en" || stored === "fr")) {
      setDetected(true);
      return;
    }

    // IP-based auto-detection
    detectCountryFromIP().then((cc) => {
      const frenchCountries = ["FR", "BE", "CH", "LU", "MC", "SN", "CI", "ML", "BF", "NE", "TG", "BJ", "GN", "MG", "CM", "CF", "TD", "CG", "CD", "GA", "DJ", "KM", "MU", "SC", "HT", "CA"];
      const lang = cc && frenchCountries.includes(cc) ? "fr" : "en";
      i18n.changeLanguage(lang);
      sessionStorage.setItem("landing_lang_set", "1");
      setDetected(true);
    });
  }, []);

  const current = i18nHook.language?.startsWith("fr") ? "fr" : "en";

  const handleSwitch = (lang: string) => {
    i18n.changeLanguage(lang);
    sessionStorage.setItem("landing_lang_set", "1");
    localStorage.setItem("i18nextLng", lang);
  };

  if (!detected) return null;

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-background/80 backdrop-blur-sm px-1.5 py-1">
      {FLAGS.map(({ lang, flag, label }) => (
        <button
          key={lang}
          onClick={() => handleSwitch(lang)}
          title={label}
          className={`text-lg leading-none px-1.5 py-0.5 rounded-full transition-all duration-150 ${
            current === lang
              ? "bg-primary/10 ring-1 ring-primary/30 scale-110"
              : "opacity-50 hover:opacity-80 hover:scale-105"
          }`}
          aria-label={`Switch to ${label}`}
        >
          {flag}
        </button>
      ))}
    </div>
  );
}
