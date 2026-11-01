"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, dictionaries, type Locale } from "./dict";

const Ctx = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useLocale(): Locale { return useContext(Ctx); }
export function useT() { const l = useContext(Ctx); return dictionaries[l]; }
