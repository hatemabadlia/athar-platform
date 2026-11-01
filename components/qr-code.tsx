/** Deterministic QR-like matrix for demo (real QR lib in production). */
export function QrCode({ seed, size = 120 }: { seed: string; size?: number }) {
  const n = 21;
  let h = 2166136261;
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return (h >>> 0) / 4294967295; };
  for (const ch of seed) h = (h ^ ch.charCodeAt(0)) * 16777619;
  const cells: boolean[] = [];
  const finder = (r: number, c: number) => (r < 7 && c < 7) || (r < 7 && c >= n - 7) || (r >= n - 7 && c < 7);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (finder(r, c)) {
      const rr = r < 7 ? r : r - (n - 7), cc = c < 7 ? c : c - (n - 7);
      cells.push(rr === 0 || rr === 6 || cc === 0 || cc === 6 || (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4));
    } else cells.push(rnd() > 0.55);
  }
  const s = size / n;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-lg bg-white">
      {cells.map((on, i) => on ? <rect key={i} x={(i % n) * s} y={Math.floor(i / n) * s} width={s} height={s} fill="#0f172a" /> : null)}
    </svg>
  );
}
