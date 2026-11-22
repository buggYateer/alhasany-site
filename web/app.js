"use strict";
/* موقع مسجد الحسني — كل البيانات من lessons.json (بيتولد بـ tools/build_data.py) */
const TG = "https://t.me/masjed_alhasany/";
const LOCAL = ["localhost", "127.0.0.1"].includes(location.hostname);
let DB, queue = [], qi = -1, cur = null, part = 1;
const $ = s => document.querySelector(s);
const app = $("#app"), audio = $("#audio");
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ICON_PLAY = '<path d="M8 5v14l11-7z"/>', ICON_PAUSE = '<path d="M6 5h4v14H6zm8 0h4v14h-4z"/>';
const SVG_PLAY = `<svg viewBox="0 0 24 24">${ICON_PLAY}</svg>`;
const CHEV = '<svg class="chev" viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>';
const TG_SVG = '<svg viewBox="0 0 24 24"><path d="M21.9 4.3 18.7 19.5c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.3 13.2l-4.8-1.5c-1-.3-1.1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.3z"/></svg>';
const KIND = { lesson: "الدروس", khutba: "خطب الجمعة", tilawa: "التلاوات", other: "متفرقات" };
const DAYS = { "أحمد_عبدالسلام": "درس الثلاثاء", "يحيى_زكريا": "درس الأربعاء", "سيد_عبدالعال": "درس الجمعة", "معاذ_زكريا": "درس السبت" };
const MONTHS = ["محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة", "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة"];
const MONTH_ALIASES = { "جماد أول": 5, "جماد آخر": 6, "جمادى الأولى": 5, "جمادى الآخرة": 6, "ربيع أول": 3, "ربيع ثان": 4, "ربيع آخر": 4 };
/* الشهر الهجري لكل مقطع: {key: "1447-05", label: "جمادى الأولى 1447"} */
function monthOf(L) {
  let m, y, r = /^(\d+)-(\d+)-(14\d\d)$/.exec(L.h || "");
  if (r) { m = +r[2]; y = r[3]; }
  else if ((r = /^(.+?)\s+(14\d\d)$/.exec(L.h || ""))) { y = r[2]; m = MONTH_ALIASES[r[1]] || MONTHS.indexOf(r[1]) + 1; }
  if (!m || m > 12) return null;
  return { key: `${y}-${String(m).padStart(2, "0")}`, label: `${MONTHS[m - 1]} ${y}` };
}
const norm = s => s.replace(/[\u064B-\u0652]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
const SURAHS = "الفاتحة البقرة آل_عمران النساء المائدة الأنعام الأعراف الأنفال التوبة يونس هود يوسف الرعد إبراهيم الحجر النحل الإسراء الكهف مريم طه الأنبياء الحج المؤمنون النور الفرقان الشعراء النمل القصص العنكبوت الروم لقمان السجدة الأحزاب سبأ فاطر يس الصافات ص الزمر غافر فصلت الشورى الزخرف الدخان الجاثية الأحقاف محمد الفتح الحجرات ق الذاريات الطور النجم القمر الرحمن الواقعة الحديد المجادلة الحشر الممتحنة الصف الجمعة المنافقون التغابن الطلاق التحريم الملك القلم الحاقة المعارج نوح الجن المزمل المدثر القيامة الإنسان المرسلات النبأ النازعات عبس التكوير الانفطار المطففين الانشقاق البروج الطارق الأعلى الغاشية الفجر البلد الشمس الليل الضحى الشرح التين العلق القدر البينة الزلزلة العاديات القارعة التكاثر العصر الهمزة الفيل قريش الماعون الكوثر الكافرون النصر المسد الإخلاص الفلق الناس".split(" ").map(x => x.replace("_", " "));
const surahNo = n => { const k = norm(n).replace(/^سوره\s*/, ""); const i = SURAHS.findIndex(x => norm(x) === k); return i + 1; };
/* السور في عنوان التلاوة */
function surahsOf(t) {
  const out = [];
  for (const m of t.matchAll(/سور(?:ة|تي)\s+(.+?)(?=\s+(?:في|من|كاملة)(?:\s|$)|\s+وآيات|\s*[–(-]|$)/g)) out.push(...m[1].split(/\s+و(?=ال|[^\s]{2,})/));
  return out.map(x => x.replace(/[()«»]/g, "").trim()).filter(x => x && !x.startsWith("آيات"));
}

function audioUrl(id, p) {
  const name = DB.lessons[id].p > 1 ? `${id}_${p}.mp3` : `${id}.mp3`;
  if (LOCAL) return `/audio/${name}`;
  return `${DB.audioBase}/audio-${Math.floor(id / 500)}/${name}`;
}
const sheikhOf = id => DB.byKey[DB.lessons[id].s];
const findSheikh = x => DB.bySlug[x] || DB.byKey[x] || null;
const sheikhName = id => (sheikhOf(id) || {}).name || "";
const fmt = s => { s = Math.floor(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`; };
const parseDur = d => (d || "").split(":").reduce((a, b) => a * 60 + (+b || 0), 0);
const seriesIds = s => s.sections.flatMap(x => x.ids);
const count = sh => ["lesson", "khutba", "tilawa", "other"].reduce((a, k) => a + sh[k].length, 0) + (sh.series || []).reduce((a, s) => a + seriesIds(s).length, 0);
const newest = ids => [...ids].sort((a, b) => b - a);
/* «7-6-1448» ← «7 جمادى الآخرة 1448هـ» */
const hijri = h => {
  if (!h) return "";
  const r = /^(\d+)-(\d+)-(14\d\d)$/.exec(h);
  return r && +r[2] >= 1 && +r[2] <= 12 ? `${+r[1]} ${MONTHS[+r[2] - 1]} ${r[3]}هـ` : h + "هـ";
};

function arch(sh) {
  const inner = sh.img ? `<img src="/${esc(sh.img)}" alt="" loading="lazy">` : `<span aria-hidden="true">${esc(sh.name.trim()[0] || "")}</span>`;
  return `<div class="arch">${inner}</div>`;
}

/* سطر الدرس */
function row(id, listKey, showSheikh) {
  const L = DB.lessons[id];
  const pos = store.get("pos:" + id, 0), dur = parseDur(L.d);
  const pct = pos && dur ? Math.min(100, pos / dur * 100) : 0;
  const meta = [["sh", showSheikh && sheikhName(id)], ["dt", hijri(L.h)], ["du", L.d]].filter(x => x[1]).map(([c, x]) => `<span class="${c}">${esc(x)}</span>`).join("");
  return `<div class="row${cur === id ? " playing" : ""}" data-id="${id}">
    <button class="play" data-play="${id}" data-list="${listKey}" ${L.p ? "" : 'disabled title="الملف ده على تليجرام بس"'} aria-label="تشغيل ${esc(L.t)}">
      <svg viewBox="0 0 24 24">${cur === id && !audio.paused ? ICON_PAUSE : ICON_PLAY}</svg></button>
    <div class="txt"><div class="t">${L.n ? `<span class="n">${L.n}</span>` : ""}${esc(L.t)}</div>
      <div class="m">${meta}</div>${pct > 1 ? `<div class="prog"><i style="width:${pct}%"></i></div>` : ""}</div>
    <a class="tg" href="${TG}${id}" target="_blank" rel="noopener" title="افتح في تليجرام" aria-label="افتح في تليجرام">${TG_SVG}</a></div>`;
}
const LISTS = {};
function list(key, ids, opts = {}) {
  LISTS[key] = ids;
  const limit = opts.limit || ids.length;
  let h = `<div class="list">` + (ids.slice(0, limit).map(i => row(i, key, opts.sheikh)).join("") || '<div class="empty">مفيش مقاطع هنا لسه</div>');
  if (ids.length > limit) h += `<button class="more" data-more="${key}" data-shown="${limit}" data-sheikh="${opts.sheikh ? 1 : ""}">عرض المزيد (${ids.length - limit})</button>`;
  return h + "</div>";
}
/* أقسام مقفولة — بتتفتح بالضغط */
function accordion(key, sections) {
  LISTS[key] = sections.flatMap(s => s.ids);
  return sections.map((s, i) => `<section class="acc">
    <button class="acc-h" aria-expanded="false" aria-controls="${key}-${i}">${CHEV}<span>${esc(s.t || "الدروس")}</span><small>${s.ids.length} درس</small></button>
    <div class="acc-b" id="${key}-${i}" hidden><div class="list" style="border:0;border-radius:0">${s.ids.map(id => row(id, key)).join("")}</div></div></section>`).join("");
}
const secH = (t, small = "", id = "", more = "") => `<div class="sec-h"${id ? ` id="${id}"` : ""}><h2>${esc(t)}</h2>${more ? `<a class="see-all" href="${more}">عرض الكل</a>` : small ? `<small>${esc(small)}</small>` : ""}</div>`;
const sheikhCards = list => `<div class="sheikhs">${list.map(s => `<a class="sh-card" href="/s/${s.slug}">${arch(s)}<div class="who"><small>الشيخ</small><div class="name">${esc(s.name)}</div></div>${DAYS[s.key] ? `<div class="day">${DAYS[s.key]}</div>` : ""}<div class="meta">${count(s)} مقطع</div></a>`).join("")}</div>`;
const othersGrid = list => `<div class="others">${list.map(s => `<a href="/s/${s.slug}">${esc(s.name)} <b>${count(s)}</b></a>`).join("")}</div>`;
const pageHead = (t, sub) => `<div class="crumbs"><a href="/">الرئيسية</a> ‹ ${esc(t)}</div><div class="page-h"><h1>${esc(t)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}</div>`;
const allIds = () => Object.keys(DB.lessons).map(Number).sort((a, b) => b - a);

/* الأقسام الرئيسية: الدروس / الخطب / التلاوات / التراويح */
function cats() {
  const inC = i => DB.collections.some(c => c.ids.includes(+i));
  const n = k => Object.entries(DB.lessons).filter(([i, L]) => L.k === k && !inC(i)).length;
  const c = DB.collections[0];
  return [
    { href: "/lessons", icon: "menu_book", t: "الدروس", n: n("lesson") },
    { href: "/khutab", icon: "mic", t: "خطب الجمعة", n: n("khutba") },
    { href: "/tilawat", icon: "graphic_eq", t: "التلاوات", n: n("tilawa") },
    ...(c ? [{ href: `/c/${c.key}`, icon: "bedtime", t: "التراويح والتهجد", n: c.ids.length }] : []),
  ];
}

/* الرئيسية */
function home() {
  const all = allIds();
  const latest = all.find(i => DB.lessons[i].p && DB.lessons[i].k === "lesson") || all[0];
  const L = DB.lessons[latest];
  const main = DB.sheikhs.filter(s => s.main), rest = DB.sheikhs.filter(s => !s.main);
  LISTS.feature = [latest];
  app.innerHTML = `
  <section class="hero">
    <nav class="cats" aria-label="الأقسام">${cats().map(c => `<a class="cat" href="${c.href}"><span class="ms" aria-hidden="true">${c.icon}</span><b>${c.t}</b><small>${c.n}</small></a>`).join("")}</nav>
    <article class="feature"><small>أحدث درس</small><h2>${esc(L.t)}</h2><p>${esc(sheikhName(latest) ? "الشيخ " + sheikhName(latest) : "")}${L.h ? " — " + esc(hijri(L.h)) : ""}</p>
      <button class="big-play" data-play="${latest}" data-list="feature">${SVG_PLAY}<span>استمع للدرس</span></button></article>
  </section>
  ${secH("دروس الأسبوع", "", "sheikhs", "/weekly")}${sheikhCards(main)}
  ${secH("آخر المستجدات", "", "latest")}${list("latest", all.slice(0, 10), { sheikh: true })}
  ${secH("خطباء ومشايخ آخرون", "", "", "/others")}${othersGrid(rest.slice(0, 8))}`;
}

/* البحث (أيقونة في الهيدر) */
function searchIds(q) {
  const words = norm(q.trim()).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return allIds().filter(i => { const h = norm(DB.lessons[i].t + " " + sheikhName(i) + " " + (DB.ctx[i] || "")); return words.every(w => h.includes(w)); });
}
function searchPage() {
  const q = new URLSearchParams(location.search).get("q") || "";
  const gq = $("#gq"); if (gq && gq.value !== q) gq.value = q;
  openSearch(true, false);
  const ids = searchIds(q);
  app.innerHTML = pageHead("البحث", q ? `${ids.length} نتيجة لـ «${q}»` : "اكتب اسم الدرس أو الشيخ أو السورة") + (q ? list("search", ids, { limit: 30, sheikh: true }) : "");
}
const searchbar = $("#searchbar"), gq = $("#gq");
function openSearch(on, focus = true) {
  searchbar.hidden = !on; $("#searchBtn").setAttribute("aria-expanded", on);
  if (on && focus) gq.focus();
}
$("#searchBtn").onclick = () => { const on = searchbar.hidden; openSearch(on); if (!on && pathParts()[0] === "search") go("/"); };
let searchTimer;
gq.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const url = "/search" + (gq.value.trim() ? "?q=" + encodeURIComponent(gq.value.trim()) : "");
    if (pathParts()[0] === "search") { history.replaceState(null, "", url); searchPage(); } else go(url);
  }, 250);
});
gq.addEventListener("keydown", e => { if (e.key === "Escape") { gq.value = ""; openSearch(false); if (pathParts()[0] === "search") go("/"); } });

/* صفحة الشيخ: الأقسام على اليمين (تابات فوق في الموبايل) والدروس على الشمال */
const shLessons = sh => [...sh.lesson, ...(sh.series || []).flatMap(seriesIds)];
const shAll = sh => [...shLessons(sh), ...sh.khutba, ...sh.tilawa, ...sh.other];
function sheikhTabs(sh) {
  const tabs = [];
  const nl = shLessons(sh).length;
  if (nl) tabs.push({ id: "recent", t: "أحدث الدروس", n: nl, group: "الدروس" });
  for (const se of sh.series || []) tabs.push({ id: se.key, t: se.title, n: seriesIds(se).length, group: "السلاسل" });
  if (sh.lesson.length && sh.series) tabs.push({ id: "lesson", t: "دروس متفرقة", n: sh.lesson.length, group: "السلاسل" });
  for (const k of ["khutba", "tilawa", "other"]) if (sh[k].length) tabs.push({ id: k, t: KIND[k], n: sh[k].length, group: "مقاطع أخرى" });
  if (!tabs.length || (!sh.series && sh.lesson.length && !nl)) tabs.unshift({ id: "lesson", t: KIND.lesson, n: sh.lesson.length, group: "الدروس" });
  return tabs;
}
function sheikhPage(key, sel) {
  const sh = findSheikh(key);
  if (!sh) return notFound();
  if (key !== sh.slug) history.replaceState(null, "", `/s/${sh.slug}${sel ? "/" + sel : ""}`);
  const tabs = sheikhTabs(sh);
  const active = tabs.find(t => t.id === sel) || tabs[0];
  let side = "", g = "";
  for (const t of tabs) {
    if (t.group !== g) { g = t.group; side += `<h4>${g}</h4>`; }
    side += `<button role="tab" data-tab="${t.id}" aria-selected="${t.id === active.id}">${esc(t.t)} <b>${t.n}</b></button>`;
  }
  const last = newest(shAll(sh)).find(i => DB.lessons[i].p) || newest(shAll(sh))[0];
  LISTS["sh-last"] = [last];
  const L = DB.lessons[last];
  app.innerHTML = `<div class="crumbs"><a href="/">الرئيسية</a> ‹ ${esc(sh.name)}</div>
  <header class="sh-head">${arch(sh)}<div class="sh-meta"><h1>${sh.main ? "الشيخ " : ""}${esc(sh.name)}</h1><p>${DAYS[sh.key] ? DAYS[sh.key] + " · " : ""}${count(sh)} مقطع</p></div></header>
  ${last ? `<div class="latest-card"><button class="play" data-play="${last}" data-list="sh-last" ${L.p ? "" : "disabled"} aria-label="تشغيل أحدث مقطع">${SVG_PLAY}</button>
    <div class="txt"><small>أحدث مقطع</small><div class="t">${esc(L.t)}</div><div class="m">${esc(hijri(L.h))}${L.d ? " — " + esc(L.d) : ""}</div></div></div>` : ""}
  <div class="split"><nav class="side" role="tablist" aria-label="الأقسام">${side}</nav><div class="panel" id="panel"></div></div>`;
  renderPanel(sh, active);
}
function renderPanel(sh, tab) {
  const s = (sh.series || []).find(x => x.key === tab.id);
  let body, n, sub;
  if (s) {
    // العرض من الأحدث للأقدم، و«التالي» في المشغل بيمشي بترتيب السلسلة الطبيعي
    const key = `series:${s.key}`, asc = seriesIds(s);
    const secs = s.sections.map(x => ({ t: x.t, ids: newest(x.ids) })).sort((a, b) => b.ids[0] - a.ids[0]);
    body = secs.length > 1 ? accordion(key, secs) : list(key, secs[0].ids);
    LISTS[key] = asc;
    n = asc.length; sub = "الأحدث الأول";
  } else {
    const ids = newest(tab.id === "recent" ? shLessons(sh) : sh[tab.id]);
    body = list(`${sh.key}:${tab.id}`, ids, { limit: 15 });
    n = ids.length; sub = "الأحدث الأول";
  }
  $("#panel").innerHTML = `<div class="panel-h"><div><h2>${esc(tab.t)}</h2><p>${n} مقطع، ${sub}</p></div></div>${body}`;
}

/* صفحات المنيو */
const PAGES = {
  latest: () => { const ids = allIds().slice(0, 10); app.innerHTML = pageHead("آخر المستجدات", "آخر 10 مقاطع نُشرت على القناة") + list("p:latest", ids, { sheikh: true }); },
  weekly: () => { app.innerHTML = pageHead("دروس الأسبوع", "مشايخ الدروس الأسبوعية في المسجد") + sheikhCards(DB.sheikhs.filter(s => s.main)) + `<div class="sec-h"><h2>خطباء ومشايخ آخرون</h2><a class="see-all" href="/others">عرض الكل</a></div>` + othersGrid(DB.sheikhs.filter(s => !s.main).slice(0, 8)); },
  series: () => {
    const cards = DB.sheikhs.flatMap(sh => (sh.series || []).map(se => `<a class="series-card" href="/s/${sh.slug}/${se.key}"><h3>${esc(se.title)}</h3><p>الشيخ ${esc(sh.name)}</p><small>${seriesIds(se).length} درس</small></a>`));
    app.innerHTML = pageHead("السلاسل", "سلاسل الدروس بالترتيب") + `<div class="series-grid">${cards.join("")}</div>`;
  },
  lessons: () => filterPage("lessons", "الدروس", "درس", "lesson", ["sheikh", "series", "month"]),
  khutab: () => filterPage("khutab", "خطب الجمعة", "خطبة", "khutba", ["sheikh", "month"]),
  tilawat: () => filterPage("tilawat", "التلاوات", "تلاوة", "tilawa", ["sheikh", "surah", "month"]),
  others: () => { const rest = DB.sheikhs.filter(s => !s.main); app.innerHTML = pageHead("خطباء ومشايخ آخرون", `${rest.length} خطيب وشيخ`) + othersGrid(rest); },
};

PAGES.sheikhs = PAGES.weekly;

let FOPEN = window.matchMedia("(min-width: 861px)").matches;
document.addEventListener("toggle", e => { if (e.target.classList && e.target.classList.contains("fbox")) FOPEN = e.target.open; }, true);
/* صفحة فيها فلاتر (الشيخ / الشهر / السورة / السلسلة) — الاختيارات بتتحفظ في اللينك */
const seriesOf = id => { for (const sh of DB.sheikhs) for (const se of sh.series || []) if (seriesIds(se).includes(id)) return se; return null; };
function filterPage(page, title, unit, kind, fields) {
  { const q0 = new URLSearchParams(location.search); const v = q0.get("sheikh"); if (v && !DB.bySlug[v] && DB.byKey[v]) { q0.set("sheikh", DB.byKey[v].slug); history.replaceState(null, "", location.pathname + "?" + q0); } }
  const base = allIds().filter(i => DB.lessons[i].k === kind && !DB.collections.some(c => c.ids.includes(i)));
  const facet = {
    sheikh: { label: "الشيخ", all: "كل المشايخ", of: i => { const sh = DB.byKey[DB.lessons[i].s]; return sh ? [sh.slug] : []; }, name: k => (DB.bySlug[k] || {}).name || k },
    month: { label: "الشهر", all: "كل الشهور", of: i => { const m = monthOf(DB.lessons[i]); return m ? [m.key] : []; }, name: k => { const [y, m] = k.split("-"); return `${MONTHS[+m - 1]} ${y}`; }, sort: (a, b) => b.localeCompare(a) },
    surah: { label: "السورة", all: "كل السور", of: i => surahsOf(DB.lessons[i].t).map(n => String(surahNo(n) || n)), name: k => SURAHS[+k - 1] || k, sort: (a, b) => (+a || 999) - (+b || 999) },
    series: { label: "السلسلة", all: "كل الدروس", of: i => { const se = seriesOf(i); return [se ? se.key : "_"]; }, name: k => k === "_" ? "دروس متفرقة" : (DB.sheikhs.flatMap(s => s.series || []).find(x => x.key === k) || {}).title || k },
  };
  const q = new URLSearchParams(location.search);
  const sel = Object.fromEntries(fields.map(f => [f, q.get(f) || ""]));
  const order = q.get("order") === "old" ? "old" : "new";
  const pick = (except) => base.filter(i => fields.every(f => f === except || !sel[f] || facet[f].of(i).includes(sel[f])));
  let ids = pick(null);
  if (order === "old") ids = [...ids].reverse();
  const selects = fields.map(f => {
    const F = facet[f], cnt = {};
    for (const i of pick(f)) for (const k of F.of(i)) cnt[k] = (cnt[k] || 0) + 1;
    const keys = Object.keys(cnt).sort(F.sort || ((a, b) => cnt[b] - cnt[a]));
    return `<label class="flt"><span>${F.label}</span><select data-f="${f}"><option value="">${F.all}</option>${keys.map(k => `<option value="${esc(k)}"${k === sel[f] ? " selected" : ""}>${esc(F.name(k))} (${cnt[k]})</option>`).join("")}</select></label>`;
  }).join("");
  const nActive = fields.filter(f => sel[f]).length + (order === "old" ? 1 : 0), active = nActive > 0;
  app.innerHTML = pageHead(title, `${base.length} ${unit}`) +
    `<div class="lp"><aside class="lp-side"><details class="fbox"${FOPEN ? " open" : ""}><summary><span class="ms" aria-hidden="true">tune</span>فلترة وترتيب${active ? ` <b class="badge">${nActive}</b>` : ""}</summary>
    <div class="filters">${selects}<label class="flt"><span>الترتيب</span><select data-f="order"><option value="new">الأحدث الأول</option><option value="old"${order === "old" ? " selected" : ""}>الأقدم الأول</option></select></label>
    ${active ? `<button class="clear-f" data-clear>مسح الفلاتر</button>` : ""}</div></details></aside>
    <div class="lp-main"><p class="f-count">${ids.length} ${unit}${active ? " حسب اختيارك" : ""}</p>` + list(`p:${page}`, ids, { limit: 30, sheikh: true }) + `</div></div>`;
}
document.addEventListener("change", e => {
  const s = e.target.closest("[data-f]"); if (!s) return;
  const q = new URLSearchParams(location.search);
  if (s.value && !(s.dataset.f === "order" && s.value === "new")) q.set(s.dataset.f, s.value); else q.delete(s.dataset.f);
  history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
  route(true);
});

/* أقسام ليالي رمضان حسب عنوان المقطع */
const RM_TYPES = [
  { id: "lessons", t: "الدروس", icon: "menu_book", test: L => L.k === "lesson" && !/تهجد|فجر/.test(L.t) },
  { id: "tarawih", t: "التراويح", icon: "nights_stay", test: L => /^(تلاوة|عشاء) ليلة/.test(L.t) },
  { id: "tahajjud", t: "التهجد", icon: "bedtime", test: L => /تهجد/.test(L.t) },
  { id: "other", t: "الفجر والجمعة", icon: "wb_twilight", test: () => true },
];
const rmType = L => RM_TYPES.find(x => x.test(L)).id;
function collectionPage(key) {
  const c = DB.collections.find(x => x.key === key);
  if (!c) return notFound();
  const type = new URLSearchParams(location.search).get("type") || "";
  const groups = RM_TYPES.map(x => ({ ...x, ids: c.ids.filter(i => rmType(DB.lessons[i]) === x.id) })).filter(x => x.ids.length);
  const cur_ = groups.find(g => g.id === type);
  const ids = cur_ ? cur_.ids : c.ids;
  app.innerHTML = pageHead(c.title, `${c.ids.length} مقطع`) +
    `<nav class="rm-tabs" aria-label="أقسام رمضان"><a href="${location.pathname}" class="${cur_ ? "" : "on"}">الكل <small>${c.ids.length}</small></a>${groups.map(g => `<a href="${location.pathname}?type=${g.id}" class="${cur_ && cur_.id === g.id ? "on" : ""}"><span class="ms" aria-hidden="true">${g.icon}</span>${g.t} <small>${g.ids.length}</small></a>`).join("")}</nav>` +
    list(`c:${key}:${type}`, ids, { sheikh: true });
}
function notFound() { app.innerHTML = '<p class="empty">الصفحة دي مش موجودة. <a href="/" style="text-decoration:underline">ارجع للرئيسية</a></p>'; }

const pathParts = () => location.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean).map(decodeURIComponent);
function go(url) { history.pushState(null, "", url); route(); }
function route(keep) {
  const p = pathParts();
  if (p[0] !== "search" && !searchbar.hidden) { gq.value = ""; openSearch(false); }
  if (p[0] === "s") sheikhPage(p[1], p[2]);
  else if (p[0] === "c") collectionPage(p[1]);
  else if (p[0] === "search") searchPage();
  else if (PAGES[p[0]]) PAGES[p[0]]();
  else if (p.length) notFound();
  else home();
  if (!keep) window.scrollTo(0, 0);
}

/* المشغل */
function play(id, listKey) {
  if (listKey) { queue = (LISTS[listKey] || [id]).filter(i => DB.lessons[i].p); qi = queue.indexOf(id); }
  if (cur === id) { audio.paused ? audio.play() : audio.pause(); return; }
  savePos();
  cur = id; part = 1;
  const L = DB.lessons[id];
  audio.src = audioUrl(id, 1);
  audio.playbackRate = store.get("speed", 1);
  const resume = store.get("pos:" + id, 0);
  audio.addEventListener("loadedmetadata", () => { if (resume > 5 && resume < audio.duration - 10) audio.currentTime = resume; }, { once: true });
  audio.play().catch(() => {});
  $("#player").hidden = false;
  $("#plTitle").textContent = (L.n ? L.n + ". " : "") + L.t;
  const se = seriesOf(id);
  $("#plSub").textContent = (sheikhName(id) ? "الشيخ " + sheikhName(id) : "مسجد الحسني") + (se ? " — " + se.title : "");
  $("#plTg").href = TG + id;
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: L.t, artist: sheikhName(id), album: "مسجد الحسني", artwork: [{ src: "/logo.png", sizes: "256x256", type: "image/png" }] });
  }
  refreshRows();
}
/* المشغل الكبير (بالضغط على المشغل الصغير) */
const player = $("#player");
function expand(on) {
  player.classList.toggle("expanded", on);
  document.body.style.overflow = on ? "hidden" : "";
  $("#plMin").hidden = !on;
}
player.addEventListener("click", e => {
  if (player.classList.contains("expanded")) return;
  if (e.target.closest("button, a, input, .speed-menu")) return;
  expand(true);
});
$("#plMin").onclick = () => expand(false);
$("#plClose").onclick = () => {
  savePos(); audio.pause(); audio.removeAttribute("src"); audio.load();
  cur = null; queue = []; qi = -1; expand(false); player.hidden = true; refreshRows();
};
function step(d) { if (queue.length && qi + d >= 0 && qi + d < queue.length) { qi += d; play(queue[qi]); } }
function savePos() { if (cur && audio.currentTime > 5 && part === 1) store.set("pos:" + cur, Math.floor(audio.currentTime)); }
function refreshRows() {
  document.querySelectorAll(".row").forEach(r => {
    const on = +r.dataset.id === cur;
    r.classList.toggle("playing", on);
    const svg = r.querySelector(".play svg");
    if (svg) svg.innerHTML = on && !audio.paused ? ICON_PAUSE : ICON_PLAY;
  });
  $("#plIcon").textContent = audio.paused ? "play_arrow" : "pause";
  $("#plPlay").setAttribute("aria-label", audio.paused ? "تشغيل" : "إيقاف مؤقت");
}
audio.addEventListener("play", refreshRows);
audio.addEventListener("pause", () => { refreshRows(); savePos(); });
audio.addEventListener("timeupdate", () => {
  $("#plTime").textContent = fmt(audio.currentTime);
  if (audio.duration) { $("#plSeek").value = audio.currentTime / audio.duration * 1000; seekFill(); }
  if (Math.floor(audio.currentTime) % 10 === 0) savePos();
});
audio.addEventListener("loadedmetadata", () => { $("#plDur").textContent = fmt(audio.duration); });
audio.addEventListener("error", () => {
  if (!cur) return;
  $("#plSub").textContent = "الملف ده مش متاح على الموقع — اسمعه على تليجرام";
  refreshRows();
});
audio.addEventListener("ended", () => {
  const L = DB.lessons[cur];
  if (part < L.p) { part++; audio.src = audioUrl(cur, part); audio.play(); return; }
  store.set("pos:" + cur, 0); step(1);
});
function seekFill() { const el = $("#plSeek"); el.style.setProperty("--p", el.value / 10 + "%"); }
$("#plSeek").addEventListener("input", e => { seekFill(); if (audio.duration) audio.currentTime = e.target.value / 1000 * audio.duration; });
$("#plPlay").onclick = () => (audio.paused ? audio.play() : audio.pause());
$("#plBack").onclick = () => (audio.currentTime = Math.max(0, audio.currentTime - 10));
$("#plFwd").onclick = () => (audio.currentTime += 10);
$("#plNext").onclick = () => step(1);
$("#plPrev").onclick = () => step(-1);
/* قايمة السرعات */
const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];
const speedMenu = $("#speedMenu"), speedBtn = $("#plSpeed");
function setSpeed(v) {
  audio.playbackRate = v; store.set("speed", v); speedBtn.textContent = v + "×";
  speedMenu.innerHTML = SPEEDS.map(x => `<button role="menuitemradio" aria-checked="${x === v}" data-speed="${x}">${x}×</button>`).join("");
}
function speedOpen(open) { speedMenu.hidden = !open; speedBtn.setAttribute("aria-expanded", open); }
speedBtn.onclick = e => { e.stopPropagation(); speedOpen(speedMenu.hidden); };
speedMenu.onclick = e => { const b = e.target.closest("[data-speed]"); if (b) { setSpeed(+b.dataset.speed); speedOpen(false); } };
document.addEventListener("click", e => { if (!e.target.closest(".speed")) speedOpen(false); });

/* المنيو الجانبي */
const drawer = $("#drawer"), scrim = $("#scrim"), menuBtn = $("#menuBtn");
function menu(open) {
  drawer.hidden = scrim.hidden = !open; menuBtn.setAttribute("aria-expanded", open);
  document.body.style.overflow = open ? "hidden" : "";
  if (open) { markCurrent(); $("#menuClose").focus(); } else menuBtn.focus();
}
menuBtn.onclick = () => menu(true);
$("#menuClose").onclick = scrim.onclick = () => menu(false);
document.addEventListener("keydown", e => { if (e.key === "Escape") { if (!drawer.hidden) menu(false); else if (!speedMenu.hidden) speedOpen(false); else expand(false); } });
function buildDrawer() {
  const item = (href, t, n) => `<a href="${href}">${t}${n ? ` <small>${n}</small>` : ""}</a>`;
  const kh = Object.values(DB.lessons).filter(L => L.k === "khutba").length, ti = Object.values(DB.lessons).filter(L => L.k === "tilawa").length;
  const se = DB.sheikhs.reduce((a, s) => a + (s.series || []).length, 0);
  $("#drawerNav").innerHTML =
    `<h4>الأقسام</h4>` + cats().map(c => item(c.href, c.t, c.n)).join("") +
    `<h4>تصفّح</h4>` + item("/", "الرئيسية") + item("/latest", "آخر المستجدات") + item("/weekly", "دروس الأسبوع", DB.sheikhs.filter(s => s.main).length) + item("/series", "السلاسل", se) +
    `<h4>أخرى</h4>` + item("/others", "خطباء ومشايخ آخرون", DB.sheikhs.filter(s => !s.main).length);
}
function markCurrent() { const here = location.pathname; drawer.querySelectorAll("nav a").forEach(a => a.toggleAttribute("aria-current", a.getAttribute("href") === here)); }
drawer.addEventListener("click", e => { if (e.target.closest("a")) setTimeout(() => menu(false), 0); });
$("#drawerSearch").addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const v = e.target.value.trim(); if (!v) return;
  menu(false); go("/search?q=" + encodeURIComponent(v));
});
if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("nexttrack", () => step(1));
  navigator.mediaSession.setActionHandler("previoustrack", () => step(-1));
  navigator.mediaSession.setActionHandler("seekbackward", () => (audio.currentTime -= 10));
  navigator.mediaSession.setActionHandler("seekforward", () => (audio.currentTime += 10));
}
window.addEventListener("pagehide", savePos);

document.addEventListener("click", e => {
  const jump = e.target.closest("[data-jump]");
  if (jump) {
    e.preventDefault();
    const to = () => document.getElementById(jump.dataset.jump)?.scrollIntoView();
    if (pathParts().length) { go("/"); setTimeout(to, 50); } else to();
    return;
  }
  const a = e.target.closest("a[href^='/']");
  if (a && !a.target && !e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); if (a.getAttribute("href") !== location.pathname + location.search) go(a.getAttribute("href")); return; }
  const b = e.target.closest("[data-play]");
  if (b) { play(+b.dataset.play, b.dataset.list); return; }
  const tab = e.target.closest("[data-tab]");
  if (tab) {
    const key = pathParts()[1];
    history.replaceState(null, "", `/s/${findSheikh(key).slug}/${tab.dataset.tab}`);
    document.querySelectorAll("[data-tab]").forEach(x => x.setAttribute("aria-selected", x === tab));
    const sh = findSheikh(key);
    renderPanel(sh, sheikhTabs(sh).find(t => t.id === tab.dataset.tab));
    tab.scrollIntoView({ block: "nearest", inline: "center" });
    if (window.innerWidth <= 860) $("#panel").scrollIntoView({ block: "start" });
    return;
  }
  if (e.target.closest("[data-clear]")) { history.replaceState(null, "", location.pathname); route(true); return; }
  const acc = e.target.closest(".acc-h");
  if (acc) {
    const open = acc.getAttribute("aria-expanded") !== "true";
    acc.setAttribute("aria-expanded", open);
    document.getElementById(acc.getAttribute("aria-controls")).hidden = !open;
    return;
  }
  const m = e.target.closest("[data-more]");
  if (m) {
    const key = m.dataset.more, shown = +m.dataset.shown, ids = LISTS[key], next = ids.slice(shown, shown + 20);
    m.insertAdjacentHTML("beforebegin", next.map(i => row(i, key, !!m.dataset.sheikh)).join(""));
    m.dataset.shown = shown + next.length;
    if (shown + next.length >= ids.length) m.remove(); else m.textContent = `عرض المزيد (${ids.length - shown - next.length})`;
  }
});

fetch("/lessons.json", { cache: "no-cache" }).then(r => r.json()).then(d => {
  DB = d;
  DB.byKey = Object.fromEntries(DB.sheikhs.map(s => [s.key, s]));
  DB.bySlug = Object.fromEntries(DB.sheikhs.map(s => [s.slug, s]));
  // كلام إضافي للبحث: اسم السلسلة والقسم ونوع المقطع
  DB.ctx = {};
  const KW = { lesson: "درس دروس", khutba: "خطبة خطب الجمعة", tilawa: "تلاوة تلاوات", other: "" };
  for (const [id, L] of Object.entries(DB.lessons)) DB.ctx[id] = KW[L.k] || "";
  for (const sh of DB.sheikhs) for (const se of sh.series || []) for (const sec of se.sections) for (const id of sec.ids) DB.ctx[id] += " " + se.title + " " + (sec.t || "");
  for (const c of DB.collections) for (const id of c.ids) DB.ctx[id] += " " + c.title;
  setSpeed(store.get("speed", 1));
  buildDrawer();
  // روابط قديمة بالشكل #/s/... تتحول للشكل الجديد
  if (location.hash.startsWith("#/")) history.replaceState(null, "", location.hash.slice(1) || "/");
  window.addEventListener("popstate", () => route());
  route();
}).catch(() => { app.innerHTML = '<p class="empty">الصفحة مقدرتش تحمّل البيانات. حدّث الصفحة وجرّب تاني.</p>'; });
