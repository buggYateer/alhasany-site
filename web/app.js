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

function audioUrl(id, p) {
  const name = DB.lessons[id].p > 1 ? `${id}_${p}.mp3` : `${id}.mp3`;
  if (LOCAL) return `/audio/${name}`;
  return `${DB.audioBase}/audio-${Math.floor(id / 500)}/${name}`;
}
const sheikhOf = id => DB.byKey[DB.lessons[id].s];
const sheikhName = id => (sheikhOf(id) || {}).name || "";
const fmt = s => { s = Math.floor(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`; };
const parseDur = d => (d || "").split(":").reduce((a, b) => a * 60 + (+b || 0), 0);
const seriesIds = s => s.sections.flatMap(x => x.ids);
const count = sh => ["lesson", "khutba", "tilawa", "other"].reduce((a, k) => a + sh[k].length, 0) + (sh.series || []).reduce((a, s) => a + seriesIds(s).length, 0);
const newest = ids => [...ids].sort((a, b) => b - a);
const hijri = h => h ? h.replace(/-/g, "/") + "هـ" : "";

function arch(sh) {
  const inner = sh.img ? `<img src="/${esc(sh.img)}" alt="" loading="lazy">` : `<span aria-hidden="true">${esc(sh.name.trim()[0] || "")}</span>`;
  return `<div class="arch">${inner}</div>`;
}

/* سطر الدرس */
function row(id, listKey, showSheikh) {
  const L = DB.lessons[id];
  const pos = store.get("pos:" + id, 0), dur = parseDur(L.d);
  const pct = pos && dur ? Math.min(100, pos / dur * 100) : 0;
  const meta = [showSheikh && sheikhName(id), hijri(L.h), L.d].filter(Boolean).map(x => `<span>${esc(x)}</span>`).join("");
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
const sheikhCards = list => `<div class="sheikhs">${list.map(s => `<a class="sh-card" href="/s/${encodeURIComponent(s.key)}">${arch(s)}<div class="name">الشيخ ${esc(s.name)}</div><div class="meta">${count(s)} مقطع</div></a>`).join("")}</div>`;
const othersGrid = list => `<div class="others">${list.map(s => `<a href="/s/${encodeURIComponent(s.key)}">${esc(s.name)} <b>${count(s)}</b></a>`).join("")}</div>`;
const pageHead = (t, sub) => `<div class="crumbs"><a href="/">الرئيسية</a> ‹ ${esc(t)}</div><div class="page-h"><h1>${esc(t)}</h1>${sub ? `<p>${esc(sub)}</p>` : ""}</div>`;
const allIds = () => Object.keys(DB.lessons).map(Number).sort((a, b) => b - a);

/* الرئيسية */
function home() {
  const all = Object.keys(DB.lessons).map(Number).sort((a, b) => b - a);
  const latest = all.find(i => DB.lessons[i].p && DB.lessons[i].k === "lesson") || all[0];
  const L = DB.lessons[latest];
  const main = DB.sheikhs.filter(s => s.main), rest = DB.sheikhs.filter(s => !s.main);
  LISTS.feature = [latest];
  app.innerHTML = `
  <section class="hero">
    <div class="intro"><h1>مسجد الحَسَنِي</h1><p>دروس المسجد وخطب الجمعة والتلاوات، مرتبة لكل شيخ.</p>
      <input class="search" id="q" type="search" placeholder="ابحث باسم الدرس أو الشيخ" aria-label="بحث" autocomplete="off"></div>
    <article class="feature"><small>أحدث درس</small><h2>${esc(L.t)}</h2><p>${esc(sheikhName(latest) ? "الشيخ " + sheikhName(latest) : "")}${L.h ? " — " + esc(hijri(L.h)) : ""}</p>
      <button class="big-play" data-play="${latest}" data-list="feature">${SVG_PLAY}<span>استمع للدرس</span></button></article>
  </section>
  <div id="results"></div>
  <div id="homeBody">
  ${secH("المشايخ", "", "sheikhs", "/sheikhs")}${sheikhCards(main)}
  ${secH("آخر المستجدات", "", "latest", "/latest")}${list("latest", all, { limit: 8, sheikh: true })}
  ${DB.collections.map(c => `${secH("مواسم")}<a class="collection" href="/c/${c.key}"><span class="moon" aria-hidden="true">🌙</span><div><h3>${esc(c.title)}</h3><p>${c.ids.length} مقطع: التراويح والتهجد والدروس</p></div></a>`).join("")}
  ${secH("خطباء ومشايخ آخرون", "", "", "/others")}${othersGrid(rest.slice(0, 8))}
  </div>`;
  const q = $("#q");
  const norm = s => s.replace(/[ً-ْ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
  q.addEventListener("input", () => {
    const v = norm(q.value.trim());
    $("#homeBody").hidden = !!v;
    document.querySelector(".hero").classList.toggle("searching", !!v);
    if (!v) { $("#results").innerHTML = ""; return; }
    const words = v.split(/\s+/);
    const hits = all.filter(i => { const h = norm(DB.lessons[i].t + " " + sheikhName(i) + " " + (DB.ctx[i] || "")); return words.every(w => h.includes(w)); });
    $("#results").innerHTML = secH("نتائج البحث", hits.length + " نتيجة") + list("search", hits, { limit: 30, sheikh: true });
  });
}

/* صفحة الشيخ: الأقسام على اليمين (تابات فوق في الموبايل) والدروس على الشمال */
function sheikhTabs(sh) {
  const tabs = (sh.series || []).map(s => ({ id: s.key, t: s.title, n: seriesIds(s).length, group: "السلاسل" }));
  for (const k of ["lesson", "khutba", "tilawa", "other"]) if (sh[k].length) tabs.push({ id: k, t: k === "lesson" && sh.series ? "دروس أخرى" : KIND[k], n: sh[k].length, group: "مقاطع" });
  return tabs;
}
function sheikhPage(key, sel) {
  const sh = DB.byKey[key];
  if (!sh) return notFound();
  const tabs = sheikhTabs(sh);
  const active = tabs.find(t => t.id === sel) || tabs[0];
  let side = "", g = "";
  for (const t of tabs) {
    if (t.group !== g) { g = t.group; side += `<h4>${g}</h4>`; }
    side += `<button role="tab" data-tab="${t.id}" aria-selected="${t.id === active.id}">${esc(t.t)} <b>${t.n}</b></button>`;
  }
  app.innerHTML = `<div class="crumbs"><a href="/">الرئيسية</a> ‹ ${esc(sh.name)}</div>
  <header class="sh-head">${arch(sh)}<div><h1>${sh.main ? "الشيخ " : ""}${esc(sh.name)}</h1><p>${count(sh)} مقطع</p></div></header>
  <div class="split"><nav class="side" role="tablist" aria-label="الأقسام">${side}</nav><div class="panel" id="panel"></div></div>`;
  renderPanel(sh, active);
}
function renderPanel(sh, tab) {
  const s = (sh.series || []).find(x => x.key === tab.id);
  let body, ids;
  if (s) {
    ids = seriesIds(s);
    body = s.sections.length > 1 ? accordion(`series:${s.key}`, s.sections) : list(`series:${s.key}`, ids);
  } else {
    ids = newest(sh[tab.id]);
    body = list(`${sh.key}:${tab.id}`, ids, { limit: 15 });
  }
  const listKey = s ? `series:${s.key}` : `${sh.key}:${tab.id}`;
  const first = ids.find(i => DB.lessons[i].p);
  $("#panel").innerHTML = `<div class="panel-h"><div><h2>${esc(tab.t)}</h2><p>${ids.length} مقطع${s ? " بالترتيب" : "، الأحدث الأول"}</p></div>
    ${first ? `<button class="play-all" data-play="${first}" data-list="${listKey}">${SVG_PLAY}${s ? "شغّل من الأول" : "شغّل الأحدث"}</button>` : ""}</div>${body}`;
}

/* صفحات المنيو */
const PAGES = {
  latest: () => { const ids = allIds(); app.innerHTML = pageHead("آخر المستجدات", "كل مقاطع القناة، الأحدث الأول") + list("p:latest", ids, { limit: 30, sheikh: true }); },
  sheikhs: () => { app.innerHTML = pageHead("المشايخ", "دروس المسجد الأسبوعية") + sheikhCards(DB.sheikhs.filter(s => s.main)) + `<div class="sec-h"><h2>خطباء ومشايخ آخرون</h2><a class="see-all" href="/others">عرض الكل</a></div>` + othersGrid(DB.sheikhs.filter(s => !s.main).slice(0, 8)); },
  series: () => {
    const cards = DB.sheikhs.flatMap(sh => (sh.series || []).map(se => `<a class="series-card" href="/s/${encodeURIComponent(sh.key)}/${se.key}"><h3>${esc(se.title)}</h3><p>الشيخ ${esc(sh.name)}</p><small>${seriesIds(se).length} درس</small></a>`));
    app.innerHTML = pageHead("السلاسل", "سلاسل الدروس بالترتيب") + `<div class="series-grid">${cards.join("")}</div>`;
  },
  khutab: () => { const ids = allIds().filter(i => DB.lessons[i].k === "khutba"); app.innerHTML = pageHead("خطب الجمعة", `${ids.length} خطبة، الأحدث الأول`) + list("p:khutab", ids, { limit: 30, sheikh: true }); },
  tilawat: () => { const ids = allIds().filter(i => DB.lessons[i].k === "tilawa"); app.innerHTML = pageHead("التلاوات", `${ids.length} تلاوة، الأحدث الأول`) + list("p:tilawat", ids, { limit: 30, sheikh: true }); },
  others: () => { const rest = DB.sheikhs.filter(s => !s.main); app.innerHTML = pageHead("خطباء ومشايخ آخرون", `${rest.length} خطيب وشيخ`) + othersGrid(rest); },
};

function collectionPage(key) {
  const c = DB.collections.find(x => x.key === key);
  if (!c) return notFound();
  app.innerHTML = pageHead(c.title, `${c.ids.length} مقطع: التراويح والتهجد والدروس`) + list(`c:${key}`, c.ids, { sheikh: true });
}
function notFound() { app.innerHTML = '<p class="empty">الصفحة دي مش موجودة. <a href="/" style="text-decoration:underline">ارجع للرئيسية</a></p>'; }

const pathParts = () => location.pathname.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean).map(decodeURIComponent);
function go(url) { history.pushState(null, "", url); route(); }
function route() {
  const p = pathParts();
  if (p[0] === "s") sheikhPage(p[1], p[2]);
  else if (p[0] === "c") collectionPage(p[1]);
  else if (PAGES[p[0]]) PAGES[p[0]]();
  else if (p.length) notFound();
  else home();
  window.scrollTo(0, 0);
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
  $("#plSub").textContent = sheikhName(id) || "مسجد الحسني";
  $("#plTg").href = TG + id;
  if ("mediaSession" in navigator) {
    navigator.mediaSession.metadata = new MediaMetadata({ title: L.t, artist: sheikhName(id), album: "مسجد الحسني", artwork: [{ src: "/logo.png", sizes: "256x256", type: "image/png" }] });
  }
  refreshRows();
}
function step(d) { if (queue.length && qi + d >= 0 && qi + d < queue.length) { qi += d; play(queue[qi]); } }
function savePos() { if (cur && audio.currentTime > 5 && part === 1) store.set("pos:" + cur, Math.floor(audio.currentTime)); }
function refreshRows() {
  document.querySelectorAll(".row").forEach(r => {
    const on = +r.dataset.id === cur;
    r.classList.toggle("playing", on);
    const svg = r.querySelector(".play svg");
    if (svg) svg.innerHTML = on && !audio.paused ? ICON_PAUSE : ICON_PLAY;
  });
  $("#plIcon").innerHTML = audio.paused ? ICON_PLAY : ICON_PAUSE;
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
$("#plBack").onclick = () => (audio.currentTime = Math.max(0, audio.currentTime - 15));
$("#plFwd").onclick = () => (audio.currentTime += 15);
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
document.addEventListener("keydown", e => { if (e.key === "Escape") { if (!drawer.hidden) menu(false); speedOpen(false); } });
function buildDrawer() {
  const item = (href, t, n) => `<a href="${href}">${t}${n ? ` <small>${n}</small>` : ""}</a>`;
  const kh = Object.values(DB.lessons).filter(L => L.k === "khutba").length, ti = Object.values(DB.lessons).filter(L => L.k === "tilawa").length;
  const se = DB.sheikhs.reduce((a, s) => a + (s.series || []).length, 0);
  $("#drawerNav").innerHTML =
    `<h4>تصفّح</h4>` + item("/", "الرئيسية") + item("/latest", "آخر المستجدات") + item("/sheikhs", "المشايخ", DB.sheikhs.filter(s => s.main).length) + item("/series", "السلاسل", se) +
    `<h4>المقاطع</h4>` + item("/khutab", "خطب الجمعة", kh) + item("/tilawat", "التلاوات", ti) + DB.collections.map(c => item(`/c/${c.key}`, esc(c.title), c.ids.length)).join("") +
    `<h4>أخرى</h4>` + item("/others", "خطباء ومشايخ آخرون", DB.sheikhs.filter(s => !s.main).length);
}
function markCurrent() { const here = location.pathname; drawer.querySelectorAll("nav a").forEach(a => a.toggleAttribute("aria-current", a.getAttribute("href") === here)); }
drawer.addEventListener("click", e => { if (e.target.closest("a")) setTimeout(() => menu(false), 0); });
$("#drawerSearch").addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  const v = e.target.value.trim(); if (!v) return;
  menu(false); if (pathParts().length) go("/");
  setTimeout(() => { const q = $("#q"); q.value = v; q.dispatchEvent(new Event("input")); q.scrollIntoView({ block: "start" }); }, 30);
});
if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("nexttrack", () => step(1));
  navigator.mediaSession.setActionHandler("previoustrack", () => step(-1));
  navigator.mediaSession.setActionHandler("seekbackward", () => (audio.currentTime -= 15));
  navigator.mediaSession.setActionHandler("seekforward", () => (audio.currentTime += 15));
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
  if (a && !a.target && !e.ctrlKey && !e.metaKey && !e.shiftKey) { e.preventDefault(); if (a.getAttribute("href") !== location.pathname) go(a.getAttribute("href")); return; }
  const b = e.target.closest("[data-play]");
  if (b) { play(+b.dataset.play, b.dataset.list); return; }
  const tab = e.target.closest("[data-tab]");
  if (tab) {
    const key = pathParts()[1];
    history.replaceState(null, "", `/s/${encodeURIComponent(key)}/${tab.dataset.tab}`);
    document.querySelectorAll("[data-tab]").forEach(x => x.setAttribute("aria-selected", x === tab));
    const sh = DB.byKey[key];
    renderPanel(sh, sheikhTabs(sh).find(t => t.id === tab.dataset.tab));
    tab.scrollIntoView({ block: "nearest", inline: "center" });
    if (window.innerWidth <= 860) $("#panel").scrollIntoView({ block: "start" });
    return;
  }
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
  window.addEventListener("popstate", route);
  route();
}).catch(() => { app.innerHTML = '<p class="empty">الصفحة مقدرتش تحمّل البيانات. حدّث الصفحة وجرّب تاني.</p>'; });
