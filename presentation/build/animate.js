// Post-processes the pptxgenjs output: adds a slide transition to every slide and native PowerPoint
// entrance animations (<p:timing>) to every shape whose name was tagged by anim(...) in build-deck.js.
// Tag format (cNvPr name): anim:<step>:<effect>:<trigger>:<durMs>:<seq>
//   effect  fade | rise (fade + float up) | zoom | wipe (from right — RTL reading direction)
//   trigger after  = plays automatically after the previous step
//           with   = plays together with the previous step
//           click  = waits for the presenter's click (the steps after it then follow automatically)
const fs = require("fs");
const JSZip = require("jszip");

const PRESET = { fade: [10, 0], rise: [42, 0], zoom: [53, 16], wipe: [22, 2] };

function effectXml(e, nextId, nodeType) {
  const [presetID, presetSubtype] = PRESET[e.effect] ?? PRESET.fade;
  const tgt = `<p:tgtEl><p:spTgt spid="${e.spid}"/></p:tgtEl>`;
  const set = `<p:set><p:cBhvr><p:cTn id="${nextId()}" dur="1" fill="hold"><p:stCondLst><p:cond delay="0"/></p:stCondLst></p:cTn>${tgt}<p:attrNameLst><p:attrName>style.visibility</p:attrName></p:attrNameLst></p:cBhvr><p:to><p:strVal val="visible"/></p:to></p:set>`;
  const fx = (filter, dur) => `<p:animEffect transition="in" filter="${filter}"><p:cBhvr><p:cTn id="${nextId()}" dur="${dur}"/>${tgt}</p:cBhvr></p:animEffect>`;
  const prop = (attr, from, to, dur) => `<p:anim calcmode="lin" valueType="num"><p:cBhvr additive="base"><p:cTn id="${nextId()}" dur="${dur}" fill="hold"/>${tgt}<p:attrNameLst><p:attrName>${attr}</p:attrName></p:attrNameLst></p:cBhvr><p:tavLst><p:tav tm="0"><p:val><p:strVal val="${from}"/></p:val></p:tav><p:tav tm="100000"><p:val><p:strVal val="${to}"/></p:val></p:tav></p:tavLst></p:anim>`;

  const id = nextId();
  let body = set;
  if (e.effect === "rise") body += fx("fade", e.dur) + prop("ppt_x", "#ppt_x", "#ppt_x", e.dur) + prop("ppt_y", "#ppt_y+.1", "#ppt_y", e.dur);
  else if (e.effect === "zoom") body += prop("ppt_w", "0", "#ppt_w", e.dur) + prop("ppt_h", "0", "#ppt_h", e.dur) + fx("fade", e.dur);
  else if (e.effect === "wipe") body += fx("wipe(right)", e.dur);
  else body += fx("fade", e.dur);
  return `<p:par><p:cTn id="${id}" presetID="${presetID}" presetClass="entr" presetSubtype="${presetSubtype}" fill="hold" grpId="0" nodeType="${nodeType}"><p:stCondLst><p:cond delay="0"/></p:stCondLst><p:childTnLst>${body}</p:childTnLst></p:cTn></p:par>`;
}

function timingXml(shapes) {
  // steps, ordered by number; a step's trigger is that of its first-added shape
  const byStep = new Map();
  for (const s of shapes.sort((a, b) => a.seq - b.seq)) {
    if (!byStep.has(s.step)) byStep.set(s.step, { trigger: s.trigger, items: [] });
    byStep.get(s.step).items.push(s);
  }
  const steps = [...byStep.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v);

  // click groups -> time slots (inner pars) -> effects
  const groups = [];
  let g = null, prevSlot = null;
  for (const st of steps) {
    const dur = Math.max(...st.items.map((i) => i.dur));
    if (!g || st.trigger === "click") {
      g = { click: st.trigger === "click", slots: [], end: 0 };
      groups.push(g);
      prevSlot = null;
    }
    if (st.trigger === "with" && prevSlot) {
      prevSlot.items.push(...st.items);
      g.end = Math.max(g.end, prevSlot.start + dur);
    } else {
      prevSlot = { start: g.end, items: [...st.items] };
      g.slots.push(prevSlot);
      g.end += dur;
    }
  }

  let n = 2;
  const nextId = () => ++n;
  const groupXml = groups.map((grp, gi) => {
    const gid = nextId();
    const cond = grp.click || gi > 0
      ? `<p:cond delay="indefinite"/>`
      : `<p:cond delay="indefinite"/><p:cond evt="onBegin" delay="0"><p:tn val="2"/></p:cond>`;
    const slots = grp.slots.map((slot, si) => {
      const sid = nextId();
      const fx = slot.items.map((e, ei) => {
        const nodeType = ei > 0 ? "withEffect" : si > 0 ? "afterEffect" : grp.click ? "clickEffect" : "afterEffect";
        return effectXml(e, nextId, nodeType);
      }).join("");
      return `<p:par><p:cTn id="${sid}" fill="hold"><p:stCondLst><p:cond delay="${slot.start}"/></p:stCondLst><p:childTnLst>${fx}</p:childTnLst></p:cTn></p:par>`;
    }).join("");
    return `<p:par><p:cTn id="${gid}" fill="hold"><p:stCondLst>${cond}</p:stCondLst><p:childTnLst>${slots}</p:childTnLst></p:cTn></p:par>`;
  }).join("");

  const bld = shapes.filter((s) => s.kind === "sp").map((s) => `<p:bldP spid="${s.spid}" grpId="0" animBg="1"/>`).join("");
  const xml = `<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot"><p:childTnLst>` +
    `<p:seq concurrent="1" nextAc="seek"><p:cTn id="2" dur="indefinite" nodeType="mainSeq"><p:childTnLst>${groupXml}</p:childTnLst></p:cTn>` +
    `<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>` +
    `<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst></p:seq>` +
    `</p:childTnLst></p:cTn></p:par></p:tnLst>${bld ? `<p:bldLst>${bld}</p:bldLst>` : ""}</p:timing>`;
  return { xml, clicks: groups.filter((x) => x.click).length };
}

async function animate(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  const slides = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f))
    .sort((a, b) => +a.match(/(\d+)\.xml/)[1] - +b.match(/(\d+)\.xml/)[1]);
  const stats = { slides: slides.length, animated: 0, clicks: 0 };
  for (const [idx, f] of slides.entries()) {
    let xml = await zip.file(f).async("string");
    if (xml.includes("<p:timing") || xml.includes("<p:transition")) throw new Error(`${f} already has timing/transition`);
    const shapes = [];
    const re = /<p:(nvSpPr|nvPicPr|nvCxnSpPr)>\s*<p:cNvPr ([^>]*?)\/?>/g;
    let m;
    while ((m = re.exec(xml))) {
      const id = m[2].match(/\bid="(\d+)"/)?.[1];
      const name = m[2].match(/\bname="([^"]*)"/)?.[1] ?? "";
      const t = name.match(/^anim:(\d+):(\w+):(\w+):(\d+):(\d+)$/);
      if (!id || !t) continue;
      shapes.push({ spid: id, kind: m[1] === "nvPicPr" ? "pic" : "sp", step: +t[1], effect: t[2], trigger: t[3], dur: +t[4], seq: +t[5] });
    }
    const ids = shapes.map((s) => s.spid);
    if (new Set(ids).size !== ids.length) throw new Error(`${f}: duplicate shape ids`);
    // first and last slide fade through black; the rest cross-fade
    const thru = idx === 0 || idx === slides.length - 1 ? ` thruBlk="1"` : "";
    let add = `<p:transition spd="slow"><p:fade${thru}/></p:transition>`;
    if (shapes.length) {
      const t = timingXml(shapes);
      add += t.xml;
      stats.animated += shapes.length;
      stats.clicks += t.clicks;
    }
    if (!xml.includes("</p:clrMapOvr>")) throw new Error(`${f}: no clrMapOvr to anchor transition`);
    xml = xml.replace("</p:clrMapOvr>", `</p:clrMapOvr>${add}`);
    zip.file(f, xml);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
  return stats;
}

module.exports = { animate };
