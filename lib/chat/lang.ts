/** French/Latin-script question → French reply in rules mode. */
export function isFrench(q: string): boolean {
  const latin = (q.match(/[a-zA-ZÀ-ÿ]/g) ?? []).length, arabic = (q.match(/[\u0600-\u06FF]/g) ?? []).length;
  return latin > arabic && /\b(je|le|la|les|des|du|où|ou|est|y a|sang|don|urgence|points|club|appel|aide)\b/i.test(q);
}
