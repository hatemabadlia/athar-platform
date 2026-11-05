import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, dictionaries, isLocale, type Locale } from "./dict";

/** Locale from the cookie, else the browser's Accept-Language (fr → French), else Arabic. */
export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  const al = (await headers()).get("accept-language") ?? "";
  const first = al.split(",")[0]?.trim().slice(0, 2).toLowerCase();
  return first === "fr" ? "fr" : DEFAULT_LOCALE;
}

export async function getT() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
