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
const TG_SVG = '<svg viewBox="0 0 24 24"><path d="M21.9 4.3 18.7 19.5c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.4-5 9.1-8.2c.4-.4-.1-.6-.6-.2L6.3 13.2l-4.8-1.5c-1-.3-1.1-1 .2-1.5L20.5 3c.9-.3 1.6.2 1.4 1.3z"/></svg>';
const KIND = { lesson: "الدروس", khutba: "خطب الجمعة", tilawa: "التلاوات", other: "متفرقات" };

function audioUrl(id, p) {
  const name = DB.lessons[id].p > 1 ? `${id}_${p}.mp3` : `${id}.mp3`;
  if (LOCAL) return `audio/${name}`;
  return `${DB.audioBase}/audio-${Math.floor(id / 500)}/${name}`;
}
const sheikhOf = id => DB.byKey[DB.lessons[id].s];
const sheikhName = id => (sheikhOf(id) || {}).name || "";
const fmt = s => { s = Math.floor(s || 0); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`; };
const parseDur = d => (d || "").split(":").reduce((a, b) => a * 60 + (+b || 0), 0);
const count = sh => ["lesson", "khutba", "tilawa", "other"].reduce((a, k) => a + sh[k].length, 0) + (sh.series || []).reduce((a, s) => a + s.sections.reduce((b, x) => b + x.ids.length, 0), 0);

function avatar(sh, cls = "") {
  const img = sh.img ? `<img src="${esc(sh.img)}" alt="" loading="lazy">` : esc(sh.name.replace(/^(ال)/, "").trim()[0] || "؟");
  return `<div class="avatar ${cls}">${img}</div>`;
}

/* سطر الدرس */
function row(id, listKey, showSheikh) {
  const L = DB.lessons[id];
  const pos = store.get("pos:" + id, 0), dur = parseDur(L.d);
  const pct = pos && dur ? Math.min(100, pos / dur * 100) : 0;
  const meta = [showSheikh && sheikhName(id), L.h && L.h.replace(/-/g, "/") + "هـ", L.d].filter(Boolean).map(esc).join(" · ");
  return `<div class="row${cur === id ? " playing" : ""}" data-id="${id}">
    <button class="play" data-play="${id}" data-list="${listKey}" ${L.p ? "" : 'disabled title="لسه مترفعش على الموقع — اسمعه على تليجرام"'} aria-label="تشغيل">
      <svg viewBox="0 0 24 24">${cur === id && !audio.paused ? ICON_PAUSE : ICON_PLAY}</svg></button>
    <div class="txt"><div class="t">${L.n ? `<span class="n">${L.n}.</span>` : ""}${esc(L.t)}</div>
      <div class="m">${meta}</div>${pct > 1 ? `<div class="prog"><i style="width:${pct}%"></i></div>` : ""}</div>
    <a class="tg" href="${TG}${id}" target="_blank" rel="noopener" title="افتح في تليجرام">${TG_SVG}</a></div>`;
}
const LISTS = {};
function list(key, ids, opts = {}) {
  LISTS[key] = ids;
  const limit = opts.limit || ids.length;
  let h = `<div class="list" data-key="${key}">`;
  if (opts.groups) {
    for (const g of opts.groups) {
      if (g.t) h += `<h4>${esc(g.t)}</h4>`;
      h += g.ids.map(i => row(i, key, opts.sheikh)).join("");
    }
  } else {
    h += ids.slice(0, limit).map(i => row(i, key, opts.sheikh)).join("") || '<div class="empty">مفيش مقاطع هنا لسه</div>';
    if (ids.length > limit) h += `<button class="more" data-more="${key}" data-shown="${limit}" data-sheikh="${opts.sheikh ? 1 : ""}">عرض المزيد (${ids.length - limit})</button>`;
  }
  return h + "</div>";
}
const secH = (t, small = "") => `<div class="sec-h"><h2>${esc(t)}</h2>${small ? `<small>${esc(small)}</small>` : ""}</div>`;

/* الصفحات */
function home() {
  const all = Object.keys(DB.lessons).map(Number).sort((a, b) => b - a);
  const main = DB.sheikhs.filter(s => s.main), rest = DB.sheikhs.filter(s => !s.main);
  app.innerHTML = `
  <section class="hero"><img src="logo.png" alt=""><div style="flex:1">
    <h1>مسجد الحَسَنِي</h1><p>دروس وخطب وتلاوات المسجد — اسمع مباشرة من الموقع</p>
    <input class="search" id="q" type="search" placeholder="ابحث عن درس أو خطبة أو شيخ…" autocomplete="off"></div></section>
  <div id="results"></div>
  <div id="homeBody">
  ${secH("آخر المستجدات")}${list("latest", all, { limit: 8, sheikh: true })}
  ${secH("المشايخ")}<div class="sheikhs">${main.map(s => `<a class="sh-card" href="#/s/${encodeURIComponent(s.key)}">${avatar(s)}<div class="name">${esc(s.name)}</div><div class="meta">${count(s)} مقطع</div></a>`).join("")}</div>
  ${DB.collections.map(c => `${secH(c.title, c.ids.length + " مقطع")}<div class="chips"><a class="chip" href="#/c/${c.key}">🌙 استمع لليالي رمضان</a></div>`).join("")}
  ${secH("خطباء ومشايخ آخرون")}<div class="chips">${rest.map(s => `<a class="chip" href="#/s/${encodeURIComponent(s.key)}">${esc(s.name)} <b>${count(s)}</b></a>`).join("")}</div>
  </div>`;
  const q = $("#q");
  q.addEventListener("input", () => {
    const v = q.value.trim().replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
    $("#homeBody").hidden = !!v;
    if (!v) { $("#results").innerHTML = ""; return; }
    const norm = s => s.replace(/[ً-ْ]/g, "").replace(/[أإآ]/g, "ا").replace(/ة/g, "ه").replace(/ى/g, "ي");
    const hits = all.filter(i => norm(DB.lessons[i].t + " " + sheikhName(i)).includes(v));
    $("#results").innerHTML = secH("نتائج البحث", hits.length + " نتيجة") + list("search", hits, { limit: 30, sheikh: true });
  });
}

function sheikhPage(key) {
  const sh = DB.byKey[key];
  if (!sh) return notFound();
  const newest = ids => [...ids].sort((a, b) => b - a);
  let h = `<div class="crumbs"><a href="#/">الرئيسية</a> ‹ ${esc(sh.name)}</div>
  <div class="sh-head">${avatar(sh, "sm")}<div><h1>${sh.main ? "الشيخ " : ""}${esc(sh.name)}</h1><p>${count(sh)} مقطع</p></div></div>`;
  if (sh.series && sh.series.length) {
    h += secH("السلاسل") + `<div class="series-grid">${sh.series.map(s => {
      const n = s.sections.reduce((a, x) => a + x.ids.length, 0);
      return `<a class="series-card" href="#/s/${encodeURIComponent(key)}/${s.key}"><h3>${esc(s.title)}</h3><p>${n} درس</p></a>`;
    }).join("")}</div>`;
  }
  for (const k of ["lesson", "khutba", "tilawa", "other"]) {
    if (sh[k].length) h += secH(sh.series && k === "lesson" ? "دروس أخرى" : KIND[k], sh[k].length + " مقطع") + list(`${key}:${k}`, newest(sh[k]), { limit: 10 });
  }
  app.innerHTML = h;
}

function seriesPage(key, skey) {
  const sh = DB.byKey[key], s = sh && (sh.series || []).find(x => x.key === skey);
  if (!s) return notFound();
  const ids = s.sections.flatMap(x => x.ids);
  app.innerHTML = `<div class="crumbs"><a href="#/">الرئيسية</a> ‹ <a href="#/s/${encodeURIComponent(key)}">${esc(sh.name)}</a> ‹ ${esc(s.title)}</div>
  <div class="sh-head">${avatar(sh, "sm")}<div><h1>${esc(s.title)}</h1><p>الشيخ ${esc(sh.name)} · ${ids.length} درس</p></div></div>
  ${secH("الدروس بالترتيب")}${list(`series:${skey}`, ids, { groups: s.sections })}`;
}

function collectionPage(key) {
  const c = DB.collections.find(x => x.key === key);
  if (!c) return notFound();
  app.innerHTML = `<div class="crumbs"><a href="#/">الرئيسية</a> ‹ ${esc(c.title)}</div>
  ${secH(c.title, c.ids.length + " مقطع")}${list(`c:${key}`, c.ids, { sheikh: true })}`;
}
function notFound() { app.innerHTML = '<p class="empty">الصفحة دي مش موجودة — <a href="#/">ارجع للرئيسية</a></p>'; }

function route() {
  const p = location.hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  if (p[0] === "s" && p[2]) seriesPage(p[1], p[2]);
  else if (p[0] === "s") sheikhPage(p[1]);
  else if (p[0] === "c") collectionPage(p[1]);
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
    navigator.mediaSession.metadata = new MediaMetadata({ title: L.t, artist: sheikhName(id), album: "مسجد الحسني", artwork: [{ src: "logo.png", sizes: "256x256", type: "image/png" }] });
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
  if (audio.duration) $("#plSeek").value = audio.currentTime / audio.duration * 1000;
  if (Math.floor(audio.currentTime) % 10 === 0) savePos();
});
audio.addEventListener("loadedmetadata", () => { $("#plDur").textContent = fmt(audio.duration); });
audio.addEventListener("ended", () => {
  const L = DB.lessons[cur];
  if (part < L.p) { part++; audio.src = audioUrl(cur, part); audio.play(); return; }
  store.set("pos:" + cur, 0); step(1);
});
$("#plSeek").addEventListener("input", e => { if (audio.duration) audio.currentTime = e.target.value / 1000 * audio.duration; });
$("#plPlay").onclick = () => (audio.paused ? audio.play() : audio.pause());
$("#plBack").onclick = () => (audio.currentTime = Math.max(0, audio.currentTime - 15));
$("#plFwd").onclick = () => (audio.currentTime += 15);
$("#plNext").onclick = () => step(1);
$("#plPrev").onclick = () => step(-1);
const SPEEDS = [1, 1.25, 1.5, 1.75, 2];
function setSpeed(v) { audio.playbackRate = v; store.set("speed", v); $("#plSpeed").textContent = v + "×"; }
$("#plSpeed").onclick = () => setSpeed(SPEEDS[(SPEEDS.indexOf(audio.playbackRate) + 1) % SPEEDS.length] || 1);
if ("mediaSession" in navigator) {
  navigator.mediaSession.setActionHandler("nexttrack", () => step(1));
  navigator.mediaSession.setActionHandler("previoustrack", () => step(-1));
  navigator.mediaSession.setActionHandler("seekbackward", () => (audio.currentTime -= 15));
  navigator.mediaSession.setActionHandler("seekforward", () => (audio.currentTime += 15));
}
window.addEventListener("pagehide", savePos);

app.addEventListener("click", e => {
  const b = e.target.closest("[data-play]");
  if (b) { play(+b.dataset.play, b.dataset.list); return; }
  const m = e.target.closest("[data-more]");
  if (m) {
    const key = m.dataset.more, shown = +m.dataset.shown, ids = LISTS[key], next = ids.slice(shown, shown + 20);
    m.insertAdjacentHTML("beforebegin", next.map(i => row(i, key, !!m.dataset.sheikh)).join(""));
    m.dataset.shown = shown + next.length;
    if (shown + next.length >= ids.length) m.remove(); else m.textContent = `عرض المزيد (${ids.length - shown - next.length})`;
  }
});

fetch("lessons.json", { cache: "no-cache" }).then(r => r.json()).then(d => {
  DB = d;
  DB.byKey = Object.fromEntries(DB.sheikhs.map(s => [s.key, s]));
  $("#plSpeed").textContent = store.get("speed", 1) + "×";
  window.addEventListener("hashchange", route);
  route();
}).catch(() => { app.innerHTML = '<p class="empty">حصلت مشكلة في التحميل — جرّب تحدّث الصفحة</p>'; });
