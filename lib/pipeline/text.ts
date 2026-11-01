/** Pure text helpers shared by the rule-based fallback, the Claude path and tests. */
import type { BloodType } from "./types";

export function normalizeArabic(text: string): string {
  return text
    .replace(/[ً-ْ]/g, "") // harakat
    .replace(/[إأآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^\p{L}\p{N}\s+-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Text used for hashing and similarity: normalised, digits kept, whitespace collapsed. */
export function canonicalText(text: string): string {
  return normalizeArabic(text).slice(0, 4000);
}

/**
 * Algerian phone numbers: mobiles 05/06/07 + 8 digits, landlines 0 + 8 digits,
 * with optional +213 / 00213 prefix and separators.
 * Returns numbers in national format "0XXXXXXXXX".
 */
export function extractPhones(text: string): string[] {
  const found = new Set<string>();
  const re = /(?:\+|00)?213[\s.-]?0?([5-7](?:[\s.-]?\d){8})|(?<!\d)0([5-7](?:[\s.-]?\d){8}|[2-4](?:[\s.-]?\d){7})(?!\d)/g;
  for (const m of text.matchAll(re)) {
    const digits = (m[1] ?? m[2]).replace(/\D/g, "");
    found.add("0" + digits);
  }
  return [...found];
}

export function normalizePhone(p: string): string | null {
  const d = p.replace(/\D/g, "");
  if (/^213[5-7]\d{8}$/.test(d)) return "0" + d.slice(3);
  if (/^00213[5-7]\d{8}$/.test(d)) return "0" + d.slice(5);
  if (/^0[5-7]\d{8}$/.test(d) || /^0[2-4]\d{7}$/.test(d)) return d;
  return null;
}

export function formatPhone(p: string): string {
  return p.length === 10 ? p.replace(/(\d{4})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4") : p;
}

export function extractBloodType(text: string): BloodType | null {
  const m = text.match(/(?<![A-Za-z])(AB|A|B|O)\s?(\+|-|−|موجب|سالب|positif|négatif|negatif)/i);
  if (!m) return null;
  const s = m[2].toLowerCase();
  const sign = s === "+" || s === "موجب" || s === "positif" ? "+" : "-";
  return `${m[1].toUpperCase()}${sign}` as BloodType;
}

/** Years mentioned in the text (1990–2099). */
export function extractYears(text: string): number[] {
  return [...new Set([...text.matchAll(/(?<!\d)(19[9]\d|20\d{2})(?!\d)/g)].map((m) => Number(m[1])))];
}

export function extractTime(text: string): string | null {
  return text.match(/(?<!\d)([01]?\d|2[0-3])[:h]([0-5]\d)(?!\d)/)?.[0] ?? null;
}

/** True if a claimed value is literally present in the source (guards against hallucinated fields). */
export function phoneAppearsIn(phone: string, source: string): boolean {
  const n = normalizePhone(phone);
  if (!n) return false;
  return extractPhones(source).includes(n);
}
