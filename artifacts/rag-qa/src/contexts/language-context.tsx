import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, TranslationKey } from "@/lib/translations";

type Lang = "en" | "ar";

interface LanguageContextType {
  lang: Lang;
  dir: "ltr" | "rtl";
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  dir: "ltr",
  toggleLang: () => {},
  t: (key) => translations.en[key] as string,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    return (localStorage.getItem("rag-lang") as Lang) ?? "en";
  });

  useEffect(() => {
    const dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    localStorage.setItem("rag-lang", lang);
  }, [lang]);

  const dir = lang === "ar" ? "rtl" : "ltr";
  const toggleLang = () => setLang(l => (l === "en" ? "ar" : "en"));
  const t = (key: TranslationKey): string =>
    (translations[lang][key] ?? translations.en[key] ?? key) as string;

  return (
    <LanguageContext.Provider value={{ lang, dir, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLang = () => useContext(LanguageContext);
