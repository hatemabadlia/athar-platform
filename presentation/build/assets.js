// Generates background/visual assets (PNG) and crops real app screenshots for the deck.
const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const OUT = path.resolve(__dirname, "../ASSETS/gen");
const SCR = path.resolve(__dirname, "../ASSETS/screens");
fs.mkdirSync(OUT, { recursive: true });

// wilaya chef-lieu coordinates (from lib/wilayas.ts — same data the app uses)
const src = fs.readFileSync(path.resolve(__dirname, "../../lib/wilayas.ts"), "utf8");
const W = [...src.matchAll(/code: (\d+), name: "[^"]*", nameAr: "([^"]*)", lat: ([\d.-]+), lng: ([\d.-]+)/g)]
  .map((m) => ({ code: +m[1], ar: m[2], lat: +m[3], lng: +m[4] }));
if (W.length !== 58) throw new Error("expected 58 wilayas, got " + W.length);

const svg = (w, h, body) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`);
const save = (name, w, h, body) => sharp(svg(w, h, body)).png().toFile(path.join(OUT, name));

(async () => {
  const BW = 2667, BH = 1500; // 16:9 at 200 dpi-ish
  // 1. Hook background: midnight with soft cyan/purple glows and a heartbeat line that breaks in the middle
  const ecg = (x0, x1, y) => {
    let d = `M ${x0} ${y}`; const step = 260;
    for (let x = x0; x < x1; x += step) d += ` L ${x + 90} ${y} L ${x + 115} ${y - 70} L ${x + 140} ${y + 120} L ${x + 165} ${y - 210} L ${x + 190} ${y + 40} L ${x + 215} ${y} L ${x + step} ${y}`;
    return d;
  };
  await save("bg-hook.png", BW, BH, `
    <defs>
      <radialGradient id="a" cx="78%" cy="30%" r="55%"><stop offset="0" stop-color="#00D4FF" stop-opacity=".18"/><stop offset="1" stop-color="#090E1A" stop-opacity="0"/></radialGradient>
      <radialGradient id="b" cx="15%" cy="85%" r="50%"><stop offset="0" stop-color="#DA70D6" stop-opacity=".16"/><stop offset="1" stop-color="#090E1A" stop-opacity="0"/></radialGradient>
      <linearGradient id="l" x1="0" x2="1"><stop offset="0" stop-color="#00D4FF" stop-opacity="0"/><stop offset=".25" stop-color="#00D4FF" stop-opacity=".9"/><stop offset=".75" stop-color="#DA70D6" stop-opacity=".9"/><stop offset="1" stop-color="#DA70D6" stop-opacity="0"/></linearGradient>
      <filter id="g"><feGaussianBlur stdDeviation="6"/></filter>
    </defs>
    <rect width="100%" height="100%" fill="#090E1A"/><rect width="100%" height="100%" fill="url(#a)"/><rect width="100%" height="100%" fill="url(#b)"/>
    <g opacity=".55"><path d="${ecg(0, 1150, 1180)}" stroke="url(#l)" stroke-width="6" fill="none" filter="url(#g)"/><path d="${ecg(0, 1150, 1180)}" stroke="url(#l)" stroke-width="3" fill="none"/>
    <path d="${ecg(1520, 2667, 1180)}" stroke="url(#l)" stroke-width="6" fill="none" filter="url(#g)"/><path d="${ecg(1520, 2667, 1180)}" stroke="url(#l)" stroke-width="3" fill="none"/></g>
    <circle cx="1150" cy="1180" r="14" fill="#00D4FF"/><circle cx="1150" cy="1180" r="40" fill="#00D4FF" opacity=".18"/>
    <circle cx="1520" cy="1180" r="14" fill="#DA70D6"/><circle cx="1520" cy="1180" r="40" fill="#DA70D6" opacity=".18"/>
    <line x1="1190" y1="1180" x2="1480" y2="1180" stroke="#AAB6C5" stroke-width="3" stroke-dasharray="6 18" opacity=".5"/>`);

  // 2. Generic dark background with subtle corner glow (two variants)
  for (const [name, cx, cy, col] of [["bg-dark-a.png", "100%", "0%", "#00D4FF"], ["bg-dark-b.png", "0%", "100%", "#DA70D6"]]) {
    await save(name, BW, BH, `<defs><radialGradient id="r" cx="${cx}" cy="${cy}" r="70%"><stop offset="0" stop-color="${col}" stop-opacity=".13"/><stop offset="1" stop-color="#090E1A" stop-opacity="0"/></radialGradient></defs>
      <rect width="100%" height="100%" fill="#090E1A"/><rect width="100%" height="100%" fill="url(#r)"/>`);
  }

  // 3. Fragmentation visual: scattered nodes with broken links (problem slide)
  const pts = [[260, 300], [620, 160], [980, 340], [420, 640], [820, 720], [1180, 600], [300, 980], [700, 1060], [1100, 960]];
  let frag = "";
  const pairs = [[0, 1], [1, 2], [0, 3], [3, 4], [4, 5], [2, 5], [3, 6], [6, 7], [7, 8], [5, 8], [4, 7]];
  for (const [i, j] of pairs) {
    const [x1, y1] = pts[i], [x2, y2] = pts[j];
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    frag += `<line x1="${x1}" y1="${y1}" x2="${mx - (mx - x1) * .25}" y2="${my - (my - y1) * .25}" stroke="#AAB6C5" stroke-opacity=".35" stroke-width="4" stroke-dasharray="10 12"/>`;
    frag += `<line x1="${x2}" y1="${y2}" x2="${mx + (x2 - mx) * .25 - (x2 - x1) * 0}" y2="${my + (y2 - my) * .25}" stroke="#AAB6C5" stroke-opacity=".35" stroke-width="4" stroke-dasharray="10 12"/>`;
  }
  pts.forEach(([x, y], k) => {
    const c = k % 3 === 0 ? "#00D4FF" : k % 3 === 1 ? "#DA70D6" : "#F5F7FA";
    frag += `<circle cx="${x}" cy="${y}" r="58" fill="${c}" opacity=".08"/><circle cx="${x}" cy="${y}" r="20" fill="${c}" opacity=".9"/>`;
  });
  await save("fragmented.png", 1440, 1240, frag);

  // 4. Algeria constellation from real wilaya coordinates (equirectangular, lng -9..12, lat 18.5..37.5)
  const MW = 1400, MH = 1300, pad = 60;
  const X = (lng) => pad + ((lng + 9) / 21) * (MW - 2 * pad);
  const Y = (lat) => pad + ((37.5 - lat) / 19) * (MH - 2 * pad);
  let net = "";
  const dist = (a, b) => Math.hypot(a.lat - b.lat, a.lng - b.lng);
  const seen = new Set();
  for (const a of W) {
    const near = W.filter((b) => b !== a).sort((p, q) => dist(a, p) - dist(a, q)).slice(0, 2);
    for (const b of near) {
      if (dist(a, b) > 4.5) continue;
      const k = [a.code, b.code].sort((x, y) => x - y).join("-"); if (seen.has(k)) continue; seen.add(k);
      net += `<line x1="${X(a.lng)}" y1="${Y(a.lat)}" x2="${X(b.lng)}" y2="${Y(b.lat)}" stroke="#00D4FF" stroke-opacity=".28" stroke-width="2.5"/>`;
    }
  }
  for (const w of W) net += `<circle cx="${X(w.lng)}" cy="${Y(w.lat)}" r="26" fill="#00D4FF" opacity=".10"/><circle cx="${X(w.lng)}" cy="${Y(w.lat)}" r="9" fill="${w.code > 48 ? "#DA70D6" : "#00D4FF"}"/>`;
  await save("algeria-network.png", MW, MH, net);

  // 5. Closing background: warm convergence of lines toward a point (help reaching its destination)
  let rays = "";
  for (let i = 0; i < 26; i++) {
    const y = 80 + i * 55, col = i % 2 ? "#00D4FF" : "#DA70D6";
    rays += `<path d="M 0 ${y} C 900 ${y}, 1400 ${750 + (y - 750) * .15}, 1950 750" stroke="${col}" stroke-opacity="${.08 + (i % 5) * .03}" stroke-width="3" fill="none"/>`;
  }
  await save("bg-close.png", BW, BH, `<defs><radialGradient id="r" cx="73%" cy="50%" r="45%"><stop offset="0" stop-color="#00D4FF" stop-opacity=".22"/><stop offset="1" stop-color="#090E1A" stop-opacity="0"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="#090E1A"/><rect width="100%" height="100%" fill="url(#r)"/>${rays}<circle cx="1950" cy="750" r="16" fill="#F5F7FA"/><circle cx="1950" cy="750" r="60" fill="#00D4FF" opacity=".2"/>`);

  // 6. Logo (temporary identity derived from the app icon) on transparent background
  await sharp(path.resolve(__dirname, "../../public/icons/icon.svg")).resize(512, 512).png().toFile(path.join(OUT, "logo.png"));

  // 7. Crops of the real screenshots (top navbar overlap removed)
  const crop = async (file, out, box) => {
    const m = await sharp(path.join(SCR, file)).metadata();
    const b = { left: box.left, top: box.top, width: Math.min(box.width, m.width - box.left), height: Math.min(box.height, m.height - box.top) };
    await sharp(path.join(SCR, file)).extract(b).png().toFile(path.join(OUT, out));
    console.log(out, b.width, "x", b.height);
  };
  await crop("pipeline.png", "pipeline-steps.png", { left: 0, top: 178, width: 1590, height: 1000 });
  await crop("pipeline.png", "pipeline-result.png", { left: 0, top: 1200, width: 1590, height: 1090 });
  await crop("duplicate.png", "duplicate-steps.png", { left: 0, top: 820, width: 1590, height: 330 });
  await crop("moderation.png", "moderation-modal.png", { left: 540, top: 85, width: 1800, height: 1630 });
  await crop("campaign.png", "campaign-top.png", { left: 570, top: 190, width: 1740, height: 1320 });
  await crop("alerts-list.png", "alerts-list-top.png", { left: 0, top: 0, width: 760, height: 1020 });
  console.log("wilayas:", W.length);
})();
